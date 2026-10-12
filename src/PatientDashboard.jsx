import { useEffect, useMemo, useState } from "react";
import BookAppointment from "./BookAppointment";
import { apiRequest } from "./api";
import { formatTime12Hour } from "./utils";
import NotificationBell from "./NotificationBell";
import { ViewPrescriptionModal } from "./PrescriptionModal";
import ReviewModal from "./ReviewModal";
import PaymentModal from "./PaymentModal";
import DoctorReviewsModal from "./DoctorReviewsModal";
import "./App.css";

const sections = [
    { id: "dashboard", label: "Dashboard", icon: "⌂" },
    { id: "doctors", label: "Find Doctors", icon: "+" },
    { id: "appointments", label: "My Appointments", icon: "▦" },
    { id: "prescriptions", label: "My Prescriptions", icon: "📋" },
    { id: "profile", label: "My Profile", icon: "◉" },
];

function PatientDashboard({ patient, onProfileUpdated, onLogout }) {
    const [doctors, setDoctors] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [favorites, setFavorites] = useState(new Set());
    const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [activeSection, setActiveSection] = useState("dashboard");
    const [doctorSearch, setDoctorSearch] = useState("");
    const [selectedSpecialization, setSelectedSpecialization] = useState("");
    const [maxFee, setMaxFee] = useState("");
    const [minExperience, setMinExperience] = useState("");
    const [minRating, setMinRating] = useState("");
    const [reschedulingAppointment, setReschedulingAppointment] = useState(null);
    const [rescheduleDate, setRescheduleDate] = useState("");
    const [rescheduleTime, setRescheduleTime] = useState("");
    const [reschedulingBusy, setReschedulingBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const [cancellingId, setCancellingId] = useState(null);
    const [payingAppointment, setPayingAppointment] = useState(null);
    const [reviewsDoctor, setReviewsDoctor] = useState(null);
    const [reviewAppointment, setReviewAppointment] = useState(null);

    const [viewRx, setViewRx] = useState(null);

    const [profile, setProfile] = useState({
        name: patient.name ?? "",
        email: patient.email ?? "",
        phone: patient.phone ?? "",
        gender: patient.gender ?? "",
    });
    const [profileSaving, setProfileSaving] = useState(false);

    const refreshDashboard = async () => {
        setLoading(true);
        setIsError(false);
        try {
            const [doctorData, appointmentData, prescriptionData, favoriteData] = await Promise.all([
                apiRequest("/doctors"),
                apiRequest(`/appointments/patient/${patient.id}`),
                apiRequest(`/prescriptions/patient/${patient.id}`),
                apiRequest(`/favorites/patient/${patient.id}`).catch(() => []),
            ]);
            setDoctors(doctorData);
            setAppointments(appointmentData);
            setPrescriptions(prescriptionData);
            if (Array.isArray(favoriteData)) {
                setFavorites(new Set(favoriteData.map((f) => f.doctor ? f.doctor.id : null).filter(Boolean)));
            }
        } catch (error) {
            console.error("Unable to load patient dashboard data:", error);
            setStatusMessage(error.message || "Unable to load dashboard data.");
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;
        Promise.all([
            apiRequest("/doctors"),
            apiRequest(`/appointments/patient/${patient.id}`),
            apiRequest(`/prescriptions/patient/${patient.id}`).catch(() => []),
            apiRequest(`/favorites/patient/${patient.id}`).catch(() => []),
        ]).then(([doctorData, appointmentData, prescriptionData, favoriteData]) => {
            if (!active) return;
            setDoctors(doctorData);
            setAppointments(appointmentData);
            setPrescriptions(prescriptionData);
            if (Array.isArray(favoriteData)) {
                setFavorites(new Set(favoriteData.map((f) => f.doctor ? f.doctor.id : null).filter(Boolean)));
            }
        }).catch((error) => {
            console.error("Unable to load patient dashboard data:", error);
            if (active) {
                setStatusMessage(error.message || "Unable to load dashboard data.");
                setIsError(true);
            }
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [patient.id]);

    const upcomingAppointments = useMemo(
        () => appointments.filter((appointment) =>
            ["PENDING", "CONFIRMED"].includes(appointment.status)
            && appointment.appointmentDate >= new Date().toISOString().slice(0, 10)
        ).sort((a, b) => `${a.appointmentDate} ${a.appointmentTime}`
            .localeCompare(`${b.appointmentDate} ${b.appointmentTime}`)),
        [appointments],
    );

    const specializations = useMemo(
        () => Array.from(new Set(doctors.map((d) => d.specialization).filter(Boolean))),
        [doctors],
    );

    const filteredDoctors = doctors.filter((doctor) => {
        const query = doctorSearch.trim().toLowerCase();
        const matchesQuery = !query
            || doctor.name.toLowerCase().includes(query)
            || (doctor.specialization && doctor.specialization.toLowerCase().includes(query));
        const matchesFavorite = !showOnlyFavorites || favorites.has(doctor.id);
        const matchesSpecialization = !selectedSpecialization || doctor.specialization === selectedSpecialization;
        const matchesFee = !maxFee || (doctor.consultationFee || 500) <= Number(maxFee);
        const matchesExp = !minExperience || (doctor.experience || 0) >= Number(minExperience);
        const matchesRating = !minRating || (doctor.rating || 0) >= Number(minRating);
        return matchesQuery && matchesFavorite && matchesSpecialization && matchesFee && matchesExp && matchesRating;
    });

    const toggleFavorite = async (doctorId) => {
        try {
            const result = await apiRequest(`/favorites/toggle?patientId=${patient.id}&doctorId=${doctorId}`, {
                method: 'POST',
            });
            setFavorites((prev) => {
                const next = new Set(prev);
                if (result.favorited) {
                    next.add(doctorId);
                } else {
                    next.delete(doctorId);
                }
                return next;
            });
        } catch (err) {
            console.error("Failed to toggle favorite doctor:", err);
        }
    };

    const navigate = (section) => {
        setActiveSection(section);
        setMobileMenuOpen(false);
        setStatusMessage("");
    };

    const cancelAppointment = async (appointmentId) => {
        if (!window.confirm("Cancel this appointment?")) {
            return;
        }
        setCancellingId(appointmentId);
        setStatusMessage("");
        try {
            await apiRequest(
                `/appointments/${appointmentId}/status?status=CANCELLED`,
                { method: "PUT" },
            );
            setAppointments((current) => current.map((appointment) =>
                appointment.id === appointmentId
                    ? { ...appointment, status: "CANCELLED" }
                    : appointment
            ));
            setStatusMessage("Appointment cancelled.");
            setIsError(false);
        } catch (error) {
            console.error("Unable to cancel appointment:", error);
            setStatusMessage(error.message || "Unable to cancel appointment.");
            setIsError(true);
        } finally {
            setCancellingId(null);
        }
    };

    const handleReschedule = async (event) => {
        event.preventDefault();
        if (!reschedulingAppointment || !rescheduleDate || !rescheduleTime) {
            return;
        }
        setReschedulingBusy(true);
        setStatusMessage("");
        setIsError(false);
        try {
            const formattedTime = rescheduleTime.length === 5 ? `${rescheduleTime}:00` : rescheduleTime;
            const updated = await apiRequest(`/appointments/${reschedulingAppointment.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    appointmentDate: rescheduleDate,
                    appointmentTime: formattedTime,
                    reason: reschedulingAppointment.reason || "Rescheduled appointment",
                }),
            });
            setAppointments((current) => current.map((app) => app.id === updated.id ? updated : app));
            setStatusMessage(`Appointment rescheduled to ${updated.appointmentDate} at ${formatTime12Hour(updated.appointmentTime)}.`);
            setReschedulingAppointment(null);
            setRescheduleDate("");
            setRescheduleTime("");
        } catch (error) {
            console.error("Reschedule failed:", error);
            setStatusMessage(error.message || "Failed to reschedule appointment.");
            setIsError(true);
        } finally {
            setReschedulingBusy(false);
        }
    };

    const saveProfile = async (event) => {
        event.preventDefault();
        const cleanedPhone = (profile.phone || "").replace(/\D/g, "");
        if (cleanedPhone.length !== 10) {
            setStatusMessage("Phone number must be exactly 10 digits.");
            setIsError(true);
            return;
        }

        setProfileSaving(true);
        setStatusMessage("");
        try {
            const updated = await apiRequest(`/patients/${patient.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    ...profile,
                    phone: cleanedPhone,
                }),
            });
            setProfile({
                name: updated.name,
                email: updated.email,
                phone: updated.phone,
                gender: updated.gender,
            });
            onProfileUpdated(updated);
            setStatusMessage("Profile updated successfully.");
            setIsError(false);
        } catch (error) {
            console.error("Unable to update patient profile:", error);
            setStatusMessage(error.message || "Unable to update profile.");
            setIsError(true);
        } finally {
            setProfileSaving(false);
        }
    };

    if (selectedDoctor) {
        return (
            <BookAppointment
                patient={patient}
                doctor={selectedDoctor}
                onBack={() => setSelectedDoctor(null)}
                onBooked={() => {
                    setSelectedDoctor(null);
                    navigate("appointments");
                    void refreshDashboard();
                    setStatusMessage("Appointment booked and pending confirmation.");
                }}
            />
        );
    }

    const statusBadge = (status) => (
        <span className={`dashboard-status dashboard-status-${status.toLowerCase()}`}>
            {status}
        </span>
    );

    return (
        <div className="dashboard-layout dashboard-patient">
            {viewRx && (
                <ViewPrescriptionModal
                    prescription={viewRx}
                    onClose={() => setViewRx(null)}
                />
            )}

            {reviewAppointment && (
                <ReviewModal
                    appointment={reviewAppointment}
                    onClose={() => setReviewAppointment(null)}
                    onSuccess={() => {
                        setStatusMessage("Thank you! Your doctor review has been recorded.");
                        setIsError(false);
                        void refreshDashboard();
                    }}
                />
            )}

            {payingAppointment && (
                <PaymentModal
                    appointment={payingAppointment}
                    onClose={() => setPayingAppointment(null)}
                    onSuccess={(updated) => {
                        setAppointments((current) => current.map((app) => (app.id === updated.id ? updated : app)));
                        setStatusMessage(`Payment of ₹${updated.doctor?.consultationFee || 500} via ${updated.paymentMethod || "Selected Method"} confirmed!`);
                        setIsError(false);
                        setPayingAppointment(null);
                        void refreshDashboard();
                    }}
                />
            )}

            {reviewsDoctor && (
                <DoctorReviewsModal
                    doctor={reviewsDoctor}
                    onClose={() => setReviewsDoctor(null)}
                />
            )}

            {reschedulingAppointment && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.55)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1200
                }}>
                    <div className="modal-content" style={{
                        backgroundColor: '#fff', borderRadius: '12px', padding: '24px',
                        maxWidth: '420px', width: '90%', boxShadow: '0 15px 35px rgba(0,0,0,0.25)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, color: '#2b6cb0' }}>🔄 Reschedule Appointment</h3>
                            <button onClick={() => setReschedulingAppointment(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                        </div>
                        <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: '#4a5568' }}>
                            Rescheduling with <strong>{reschedulingAppointment.doctor?.name || "Doctor"}</strong>
                        </p>
                        <form onSubmit={handleReschedule}>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.85rem' }}>New Date</label>
                                <input
                                    type="date"
                                    required
                                    min={new Date().toISOString().slice(0, 10)}
                                    value={rescheduleDate}
                                    onChange={(e) => setRescheduleDate(e.target.value)}
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0' }}
                                />
                            </div>
                            <div style={{ marginBottom: '18px' }}>
                                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.85rem' }}>
                                    New Time: <strong>{rescheduleTime ? formatTime12Hour(rescheduleTime) : "Select 12-hour slot"}</strong>
                                </label>
                                <input
                                    type="time"
                                    required
                                    value={rescheduleTime}
                                    onChange={(e) => setRescheduleTime(e.target.value)}
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e0' }}
                                />
                                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {[
                                        "09:00", "09:30", "10:00", "10:30",
                                        "11:00", "11:30", "14:00", "14:30",
                                        "15:00", "15:30", "16:00", "16:30",
                                        "17:00"
                                    ].map((slot) => {
                                        const formatted = formatTime12Hour(slot);
                                        const isSelected = rescheduleTime === slot || rescheduleTime === `${slot}:00`;
                                        return (
                                            <button
                                                key={slot}
                                                type="button"
                                                onClick={() => setRescheduleTime(slot)}
                                                style={{
                                                    padding: '3px 8px',
                                                    borderRadius: '4px',
                                                    border: isSelected ? '2px solid #2b6cb0' : '1px solid #cbd5e0',
                                                    backgroundColor: isSelected ? '#ebf8ff' : '#fff',
                                                    color: isSelected ? '#2b6cb0' : '#4a5568',
                                                    fontWeight: isSelected ? 'bold' : 'normal',
                                                    fontSize: '0.78rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {formatted}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setReschedulingAppointment(null)} disabled={reschedulingBusy} style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e0', background: '#fff' }}>Cancel</button>
                                <button type="submit" disabled={reschedulingBusy} style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#2b6cb0', color: '#fff', fontWeight: 'bold' }}>{reschedulingBusy ? "Updating…" : "Confirm Reschedule"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <aside className={`dashboard-sidebar ${mobileMenuOpen ? "dashboard-sidebar-open" : ""}`}>
                <div className="dashboard-brand"><span>+</span> Doctor Appointment</div>
                <p className="dashboard-sidebar-caption">PATIENT PORTAL</p>
                <nav className="dashboard-side-nav" aria-label="Patient navigation">
                    {sections.map((section) => (
                        <button
                            type="button"
                            key={section.id}
                            className={activeSection === section.id ? "active" : ""}
                            onClick={() => navigate(section.id)}
                        >
                            <span className="dashboard-nav-icon">{section.icon}</span>
                            {section.label}
                        </button>
                    ))}
                </nav>
                <button type="button" className="dashboard-side-logout" onClick={onLogout}>
                    <span className="dashboard-nav-icon">↪</span> Logout
                </button>
            </aside>

            <div className="dashboard-main">
                <header className="dashboard-topbar">
                    <button
                        type="button"
                        className="dashboard-menu-toggle"
                        aria-label="Toggle navigation"
                        aria-expanded={mobileMenuOpen}
                        onClick={() => setMobileMenuOpen((open) => !open)}
                    >☰</button>
                    <div style={{ flex: 1 }}>
                        <span className="dashboard-topbar-label">Patient workspace</span>
                        <strong>{profile.name || patient.name}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <NotificationBell user={{ id: patient.id, email: patient.email }} />
                        <div className="dashboard-avatar" aria-hidden="true">
                            {(profile.name || patient.name || "P").slice(0, 1).toUpperCase()}
                        </div>
                    </div>
                </header>

                <main className="dashboard-content">
                    {statusMessage && (
                        <p className={isError ? "form-error" : "form-success"} role={isError ? "alert" : "status"}>
                            {statusMessage}
                        </p>
                    )}

                    <section className="dashboard-welcome">
                        <div>
                            <p className="dashboard-eyebrow">YOUR HEALTH, OUR PRIORITY</p>
                            <h1>Welcome back, {profile.name || patient.name}!</h1>
                            <p>Find trusted care and keep track of your appointments in one place.</p>
                        </div>
                        <div className="dashboard-welcome-art" aria-hidden="true">🩺</div>
                    </section>

                    {loading ? (
                        <div className="dashboard-empty">Loading your dashboard…</div>
                    ) : (
                        <>
                            {activeSection === "dashboard" && (
                                <>
                                    <section className="dashboard-stat-grid" aria-label="Patient summary">
                                        <article className="dashboard-stat stat-blue"><span>Available doctors</span><strong>{doctors.length}</strong><small>In the directory</small></article>
                                        <article className="dashboard-stat stat-green"><span>Upcoming appointments</span><strong>{upcomingAppointments.length}</strong><small>Pending or confirmed</small></article>
                                        <article className="dashboard-stat stat-purple"><span>My Prescriptions</span><strong>{prescriptions.length}</strong><small>Digital Rx records</small></article>
                                        <article className="dashboard-stat stat-red"><span>Cancelled appointments</span><strong>{appointments.filter((item) => item.status === "CANCELLED").length}</strong><small>Cancelled bookings</small></article>
                                    </section>

                                    <section className="dashboard-panel">
                                        <div className="dashboard-panel-heading">
                                            <div><p className="dashboard-eyebrow">YOUR SCHEDULE</p><h2>Upcoming appointments</h2></div>
                                            <button type="button" className="dashboard-text-action" onClick={() => navigate("appointments")}>View all</button>
                                        </div>
                                        <div className="dashboard-table-wrap">
                                            <table className="dashboard-table">
                                                <thead><tr><th>Date &amp; time</th><th>Doctor</th><th>Specialization</th><th>Status</th><th>Action</th></tr></thead>
                                                <tbody>
                                                    {upcomingAppointments.slice(0, 5).map((appointment) => (
                                                        <tr key={appointment.id}>
                                                            <td>{appointment.appointmentDate}<small>{formatTime12Hour(appointment.appointmentTime)}</small></td>
                                                            <td>{appointment.doctor?.name || "Doctor"}</td>
                                                            <td>{appointment.doctor?.specialization || "—"}</td>
                                                            <td>{statusBadge(appointment.status)}</td>
                                                            <td>{["PENDING", "CONFIRMED"].includes(appointment.status) ? <button className="dashboard-row-action dashboard-row-danger" type="button" disabled={cancellingId === appointment.id} onClick={() => void cancelAppointment(appointment.id)}>{cancellingId === appointment.id ? "Cancelling…" : "Cancel"}</button> : "—"}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {upcomingAppointments.length === 0 && <p className="dashboard-empty">No upcoming appointments. Find a doctor to get started.</p>}
                                        </div>
                                    </section>

                                    <section className="dashboard-quick-actions">
                                        <button type="button" onClick={() => navigate("doctors")}><span>＋</span><strong>Find doctors</strong><small>Browse specialists</small></button>
                                        <button type="button" onClick={() => navigate("doctors")}><span>▣</span><strong>Book appointment</strong><small>Choose a doctor and time</small></button>
                                        <button type="button" onClick={() => navigate("prescriptions")}><span>📋</span><strong>My Prescriptions</strong><small>View &amp; print digital Rx</small></button>
                                        <button type="button" onClick={() => navigate("profile")}><span>◉</span><strong>Update profile</strong><small>Keep details current</small></button>
                                    </section>
                                </>
                            )}

                            {activeSection === "doctors" && (
                                <section className="dashboard-panel">
                                    <div className="dashboard-panel-heading" style={{ flexWrap: 'wrap', gap: '12px' }}>
                                        <div><p className="dashboard-eyebrow">DOCTOR DIRECTORY</p><h2>Find a doctor</h2></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <button
                                                type="button"
                                                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '20px',
                                                    border: '1px solid #cbd5e0',
                                                    backgroundColor: showOnlyFavorites ? '#fed7e2' : '#fff',
                                                    color: showOnlyFavorites ? '#9b2c2c' : '#4a5568',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold',
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                {showOnlyFavorites ? '❤️ Favorites Only' : '🤍 Show All Doctors'}
                                            </button>
                                            <label className="dashboard-search"><span className="visually-hidden">Search doctors</span><input type="search" placeholder="Search name or specialization" value={doctorSearch} onChange={(event) => setDoctorSearch(event.target.value)} /></label>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', margin: '14px 0 18px 0', padding: '12px 16px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#4a5568' }}>Filter doctors:</span>
                                        <select
                                            value={selectedSpecialization}
                                            onChange={(e) => setSelectedSpecialization(e.target.value)}
                                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.85rem', backgroundColor: '#fff' }}
                                        >
                                            <option value="">All Specializations</option>
                                            {specializations.map((spec) => (
                                                <option key={spec} value={spec}>{spec}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={maxFee}
                                            onChange={(e) => setMaxFee(e.target.value)}
                                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.85rem', backgroundColor: '#fff' }}
                                        >
                                            <option value="">Any Consultation Fee</option>
                                            <option value="500">Up to ₹500</option>
                                            <option value="1000">Up to ₹1000</option>
                                            <option value="1500">Up to ₹1500</option>
                                            <option value="2000">Up to ₹2000</option>
                                        </select>
                                        <select
                                            value={minExperience}
                                            onChange={(e) => setMinExperience(e.target.value)}
                                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.85rem', backgroundColor: '#fff' }}
                                        >
                                            <option value="">Any Experience</option>
                                            <option value="3">3+ Years</option>
                                            <option value="5">5+ Years</option>
                                            <option value="10">10+ Years</option>
                                        </select>
                                        <select
                                            value={minRating}
                                            onChange={(e) => setMinRating(e.target.value)}
                                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.85rem', backgroundColor: '#fff' }}
                                        >
                                            <option value="">Any Rating</option>
                                            <option value="4">⭐ 4.0 & above</option>
                                            <option value="4.5">⭐ 4.5 & above</option>
                                        </select>
                                        {(selectedSpecialization || maxFee || minExperience || minRating || doctorSearch || showOnlyFavorites) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedSpecialization("");
                                                    setMaxFee("");
                                                    setMinExperience("");
                                                    setMinRating("");
                                                    setDoctorSearch("");
                                                    setShowOnlyFavorites(false);
                                                }}
                                                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #fed7d7', background: '#fff5f5', color: '#c53030', fontSize: '0.82rem', cursor: 'pointer', fontWeight: '600' }}
                                            >
                                                ✕ Clear Filters
                                            </button>
                                        )}
                                    </div>
                                    {filteredDoctors.length === 0 ? <p className="dashboard-empty">No doctors match your search or filter.</p> : (
                                        <div className="dashboard-doctor-grid">
                                            {filteredDoctors.map((doctor) => {
                                                const isFav = favorites.has(doctor.id);
                                                return (
                                                    <article className="dashboard-doctor-card" key={doctor.id} style={{ position: 'relative' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleFavorite(doctor.id)}
                                                            style={{
                                                                position: 'absolute', top: '12px', right: '12px',
                                                                background: 'none', border: 'none', fontSize: '1.3rem',
                                                                cursor: 'pointer'
                                                            }}
                                                            title={isFav ? "Remove from favorites" : "Add to favorites"}
                                                        >
                                                            {isFav ? '❤️' : '🤍'}
                                                        </button>
                                                        <div className="dashboard-doctor-avatar">＋</div>
                                                        <h3>
                                                            {doctor.name}
                                                            {doctor.verificationStatus === 'APPROVED' && (
                                                                <span title="Verified Doctor" style={{ color: '#38a169', fontSize: '1.1rem', marginLeft: '6px' }}>✓</span>
                                                            )}
                                                        </h3>
                                                        <p className="dashboard-doctor-specialty">{doctor.specialization}</p>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0 10px 0', fontSize: '0.85rem' }}>
                                                            <span style={{ color: '#d69e2e', fontWeight: 'bold' }}>
                                                                ⭐ {doctor.rating != null && doctor.rating > 0 ? doctor.rating.toFixed(1) : "New"} {doctor.reviewCount ? `(${doctor.reviewCount})` : ""}
                                                            </span>
                                                            <span style={{ color: '#2b6cb0', fontWeight: 'bold' }}>
                                                                ₹{doctor.consultationFee || 500}
                                                            </span>
                                                        </div>
                                                        <dl>
                                                            <div><dt>Qualification</dt><dd>{doctor.qualification || "Not provided"}</dd></div>
                                                            <div><dt>Experience</dt><dd>{doctor.experience ?? "—"}{doctor.experience != null ? " years" : ""}</dd></div>
                                                        </dl>
                                                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                                            <button type="button" onClick={() => setSelectedDoctor(doctor)} style={{ flex: 1 }}>Book appointment</button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setReviewsDoctor(doctor)}
                                                                style={{
                                                                    padding: '8px 12px',
                                                                    backgroundColor: '#f7fafc',
                                                                    border: '1px solid #cbd5e0',
                                                                    borderRadius: '6px',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.82rem',
                                                                    fontWeight: '600',
                                                                    color: '#2d3748'
                                                                }}
                                                                title="View doctor ratings and reviews"
                                                            >
                                                                ⭐ Reviews
                                                            </button>
                                                        </div>
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    )}
                                </section>
                            )}

                            {activeSection === "appointments" && (
                                <section className="dashboard-panel">
                                    <div className="dashboard-panel-heading"><div><p className="dashboard-eyebrow">APPOINTMENT HISTORY</p><h2>My appointments</h2></div><button type="button" className="dashboard-text-action" onClick={() => void refreshDashboard()}>Refresh</button></div>
                                    <div className="dashboard-table-wrap"><table className="dashboard-table">
                                        <thead><tr><th>Date &amp; time</th><th>Doctor</th><th>Mode</th><th>Payment</th><th>Status</th><th>Action</th></tr></thead>
                                        <tbody>{appointments.map((appointment) => {
                                            const isVideo = appointment.consultationType === "VIDEO";
                                            const meetUrl = appointment.meetingUrl || `https://meet.jit.si/doc-appt-${appointment.id}`;
                                            return (
                                                <tr key={appointment.id}>
                                                    <td>{appointment.appointmentDate}<small>{formatTime12Hour(appointment.appointmentTime)}</small></td>
                                                    <td>{appointment.doctor?.name || "Doctor"}<small>{appointment.doctor?.specialization || ""}</small></td>
                                                    <td>
                                                        <span style={{ fontSize: '0.8rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: isVideo ? '#ebf8ff' : '#f7fafc', color: isVideo ? '#2b6cb0' : '#4a5568', border: '1px solid #cbd5e0' }}>
                                                            {isVideo ? '📹 Video' : '🏢 In-Person'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {appointment.paymentStatus === 'PAID' ? (
                                                            <span style={{ color: '#276749', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                                Paid ✓ {appointment.paymentMethod ? `(${appointment.paymentMethod})` : ''}
                                                            </span>
                                                        ) : appointment.status === 'CANCELLED' ? (
                                                            <span style={{ color: '#a0aec0', fontSize: '0.85rem' }}>—</span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className="dashboard-row-action"
                                                                onClick={() => setPayingAppointment(appointment)}
                                                                style={{ backgroundColor: '#2f855a', color: '#fff', fontSize: '0.78rem', padding: '5px 10px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' }}
                                                            >
                                                                Pay ₹{appointment.doctor?.consultationFee || 500} 💳
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td>{statusBadge(appointment.status)}</td>
                                                    <td className="dashboard-row-actions">
                                                        {isVideo && appointment.status === 'CONFIRMED' && (
                                                            <a
                                                                href={meetUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="dashboard-row-action"
                                                                style={{ backgroundColor: '#3182ce', color: '#fff', textDecoration: 'none', display: 'inline-block' }}
                                                            >
                                                                Join Video 📹
                                                            </a>
                                                        )}
                                                        {appointment.status === 'COMPLETED' && (
                                                            <button
                                                                type="button"
                                                                className="dashboard-row-action"
                                                                style={{ backgroundColor: '#d69e2e', color: '#fff' }}
                                                                onClick={() => setReviewAppointment(appointment)}
                                                            >
                                                                Rate &amp; Review ⭐
                                                            </button>
                                                        )}
                                                        {["PENDING", "CONFIRMED"].includes(appointment.status) && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    className="dashboard-row-action"
                                                                    style={{ backgroundColor: '#3182ce', color: '#fff' }}
                                                                    onClick={() => {
                                                                        setReschedulingAppointment(appointment);
                                                                        setRescheduleDate(appointment.appointmentDate);
                                                                        setRescheduleTime(appointment.appointmentTime ? appointment.appointmentTime.slice(0, 5) : "");
                                                                    }}
                                                                >
                                                                    Reschedule 🔄
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="dashboard-row-action dashboard-row-danger"
                                                                    disabled={cancellingId === appointment.id}
                                                                    onClick={() => void cancelAppointment(appointment.id)}
                                                                >
                                                                    {cancellingId === appointment.id ? "Cancelling…" : "Cancel"}
                                                                </button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}</tbody>
                                    </table>{appointments.length === 0 && <p className="dashboard-empty">You have no appointments yet.</p>}</div>
                                </section>
                            )}

                            {activeSection === "prescriptions" && (
                                <section className="dashboard-panel">
                                    <div className="dashboard-panel-heading"><div><p className="dashboard-eyebrow">DIGITAL HEALTH RECORDS</p><h2>My Prescriptions</h2></div><button type="button" className="dashboard-text-action" onClick={() => void refreshDashboard()}>Refresh</button></div>
                                    <div className="dashboard-table-wrap">
                                        <table className="dashboard-table">
                                            <thead><tr><th>Date</th><th>Doctor</th><th>Specialization</th><th>Diagnosis</th><th>Action</th></tr></thead>
                                            <tbody>
                                                {prescriptions.map((rx) => (
                                                    <tr key={rx.id}>
                                                        <td>{new Date(rx.createdAt).toLocaleDateString()}</td>
                                                        <td>Dr. {rx.doctor ? rx.doctor.name : 'Doctor'}</td>
                                                        <td>{rx.doctor ? rx.doctor.specialization : '—'}</td>
                                                        <td><strong>{rx.diagnosis}</strong></td>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="dashboard-row-action"
                                                                style={{ backgroundColor: '#2b6cb0', color: '#fff' }}
                                                                onClick={() => setViewRx(rx)}
                                                            >
                                                                View / Print Rx 🖨️
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {prescriptions.length === 0 && <p className="dashboard-empty">You have no digital prescriptions yet.</p>}
                                    </div>
                                </section>
                            )}

                            {activeSection === "profile" && (
                                <section className="dashboard-panel dashboard-profile-panel">
                                    <div className="dashboard-panel-heading"><div><p className="dashboard-eyebrow">ACCOUNT DETAILS</p><h2>My profile</h2></div></div>
                                    <form className="dashboard-profile-form" onSubmit={saveProfile}>
                                        <label>Full name<input required maxLength="120" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
                                        <label>Phone (10 digits)
                                            <input
                                                type="tel"
                                                required
                                                maxLength="10"
                                                pattern="[0-9]{10}"
                                                placeholder="10-digit mobile number"
                                                value={profile.phone}
                                                onChange={(event) => setProfile({
                                                    ...profile,
                                                    phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                                                })}
                                            />
                                        </label>
                                        <label>Gender<select required value={profile.gender} onChange={(event) => setProfile({ ...profile, gender: event.target.value })}><option value="">Select gender</option><option>Female</option><option>Male</option><option>Other</option></select></label>
                                        <p className="dashboard-profile-note">Date of birth: {patient.dateOfBirth || "Not provided"}</p>
                                        <button type="submit" disabled={profileSaving}>{profileSaving ? "Saving…" : "Save profile"}</button>
                                    </form>
                                </section>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}

export default PatientDashboard;
