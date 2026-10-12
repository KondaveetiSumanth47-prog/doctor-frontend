import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "./api";
import { formatTime12Hour } from "./utils";
import NotificationBell from "./NotificationBell";
import { CreatePrescriptionModal, ViewPrescriptionModal } from "./PrescriptionModal";
import "./App.css";

const sections = [
    { id: "dashboard", label: "Dashboard", icon: "⌂" },
    { id: "queue", label: "Today's Queue", icon: "🔢" },
    { id: "appointments", label: "My Appointments", icon: "▦" },
    { id: "patients", label: "My Patients", icon: "♧" },
    { id: "prescriptions", label: "Issued Prescriptions", icon: "📋" },
    { id: "reviews", label: "Patient Reviews", icon: "⭐" },
    { id: "profile", label: "Profile & Fees", icon: "◉" },
    { id: "availability", label: "Availability", icon: "◷" },
];

function DoctorDashboard({ doctor, onLogout }) {
    const [doctorProfile, setDoctorProfile] = useState(doctor);
    const [consultationFeeInput, setConsultationFeeInput] = useState(doctor.consultationFee || 500);
    const [feeSaving, setFeeSaving] = useState(false);
    const [doctorReviews, setDoctorReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);

    const [appointments, setAppointments] = useState([]);
    const [availabilities, setAvailabilities] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [queue, setQueue] = useState([]);
    const [queueLoading, setQueueLoading] = useState(false);
    const [activeSection, setActiveSection] = useState("dashboard");
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const [availabilityMessage, setAvailabilityMessage] = useState("");

    const [rxAppointment, setRxAppointment] = useState(null);
    const [viewRx, setViewRx] = useState(null);

    const [availabilityForm, setAvailabilityForm] = useState({
        dayOfWeek: "MONDAY",
        startTime: "09:00",
        endTime: "17:00",
    });

    const loadAppointments = async () => {
        try {
            const data = await apiRequest(`/appointments/doctor/${doctor.id}`);
            setAppointments(data);
            return data;
        } catch (error) {
            console.error("Unable to load doctor appointments:", error);
            setMessage(error.message || "Unable to load appointments.");
            setIsError(true);
            return null;
        }
    };

    const loadPrescriptions = async () => {
        try {
            const data = await apiRequest(`/prescriptions/doctor/${doctor.id}`);
            setPrescriptions(data);
        } catch (error) {
            console.error("Unable to load doctor prescriptions:", error);
        }
    };

    const loadQueue = async () => {
        setQueueLoading(true);
        try {
            const data = await apiRequest(`/appointments/doctor/${doctor.id}/queue`);
            setQueue(data);
            return data;
        } catch (error) {
            console.error("Unable to load patient queue:", error);
            return [];
        } finally {
            setQueueLoading(false);
        }
    };

    const loadAvailabilities = async () => {
        setAvailabilityLoading(true);
        try {
            const data = await apiRequest(`/availabilities/doctor/${doctor.id}`);
            setAvailabilities(data);
            return data;
        } catch (error) {
            console.error("Unable to load availability:", error);
            setAvailabilityMessage(error.message || "Unable to load availability.");
            return null;
        } finally {
            setAvailabilityLoading(false);
        }
    };

    const loadReviews = async () => {
        setReviewsLoading(true);
        try {
            const data = await apiRequest(`/reviews/doctor/${doctor.id}`);
            setDoctorReviews(data);
            return data;
        } catch (error) {
            console.error("Unable to load doctor reviews:", error);
            return [];
        } finally {
            setReviewsLoading(false);
        }
    };

    const handleSaveFee = async (e) => {
        e.preventDefault();
        setFeeSaving(true);
        setMessage("");
        setIsError(false);
        try {
            const updated = await apiRequest(`/doctors/${doctor.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    name: doctorProfile.name,
                    email: doctorProfile.email,
                    phone: doctorProfile.phone,
                    specialization: doctorProfile.specialization,
                    qualification: doctorProfile.qualification,
                    experience: doctorProfile.experience,
                    consultationFee: Number(consultationFeeInput),
                }),
            });
            setDoctorProfile(updated);
            setMessage(`Consultation fee updated successfully to ₹${updated.consultationFee || consultationFeeInput}!`);
        } catch (err) {
            console.error("Unable to update consultation fee:", err);
            setMessage(err.message || "Unable to update consultation fee.");
            setIsError(true);
        } finally {
            setFeeSaving(false);
        }
    };

    useEffect(() => {
        let active = true;
        Promise.allSettled([
            apiRequest(`/appointments/doctor/${doctor.id}`),
            apiRequest(`/availabilities/doctor/${doctor.id}`),
            apiRequest(`/prescriptions/doctor/${doctor.id}`),
            apiRequest(`/appointments/doctor/${doctor.id}/queue`),
            apiRequest(`/reviews/doctor/${doctor.id}`),
        ]).then(([appointmentResult, availabilityResult, prescriptionResult, queueResult, reviewResult]) => {
            if (!active) return;
            if (appointmentResult.status === "fulfilled") {
                setAppointments(appointmentResult.value);
            }
            if (availabilityResult.status === "fulfilled") {
                setAvailabilities(availabilityResult.value);
            }
            if (prescriptionResult.status === "fulfilled") {
                setPrescriptions(prescriptionResult.value);
            }
            if (queueResult.status === "fulfilled") {
                setQueue(queueResult.value);
            }
            if (reviewResult.status === "fulfilled") {
                setDoctorReviews(reviewResult.value);
            }
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [doctor.id]);

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const todayAppointments = useMemo(
        () => appointments.filter((appointment) => appointment.appointmentDate === todayKey)
            .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime)),
        [appointments, todayKey],
    );

    const patients = useMemo(() => {
        const byId = new Map();
        appointments.forEach(({ patient }) => {
            if (patient?.id != null && !byId.has(patient.id)) {
                byId.set(patient.id, patient);
            }
        });
        return [...byId.values()];
    }, [appointments]);

    const navigate = (section) => {
        setActiveSection(section);
        setMobileMenuOpen(false);
        setMessage("");
    };

    const updateStatus = async (appointmentId, status) => {
        setUpdatingId(appointmentId);
        setMessage("");
        try {
            const updated = await apiRequest(
                `/appointments/${appointmentId}/status?status=${status}`,
                { method: "PUT" },
            );
            setAppointments((current) => current.map((appointment) =>
                appointment.id === appointmentId ? updated : appointment
            ));
            setMessage(`Appointment ${status.toLowerCase()} successfully.`);
            setIsError(false);
        } catch (error) {
            console.error("Unable to update appointment:", error);
            setMessage(error.message || "Unable to update appointment.");
            setIsError(true);
        } finally {
            setUpdatingId(null);
        }
    };

    const saveAvailability = async (event) => {
        event.preventDefault();
        setAvailabilityLoading(true);
        setAvailabilityMessage("");
        try {
            await apiRequest("/availabilities", {
                method: "POST",
                body: JSON.stringify({
                    doctor: { id: doctor.id },
                    ...availabilityForm,
                }),
            });
            const data = await apiRequest(`/availabilities/doctor/${doctor.id}`);
            setAvailabilities(data);
            setAvailabilityMessage("Availability saved.");
        } catch (error) {
            console.error("Unable to save availability:", error);
            setAvailabilityMessage(error.message || "Unable to save availability.");
        } finally {
            setAvailabilityLoading(false);
        }
    };

    const deleteAvailability = async (availabilityId) => {
        setAvailabilityLoading(true);
        setAvailabilityMessage("");
        try {
            await apiRequest(`/availabilities/${availabilityId}`, { method: "DELETE" });
            setAvailabilities((current) => current.filter((slot) => slot.id !== availabilityId));
            setAvailabilityMessage("Availability removed.");
        } catch (error) {
            console.error("Unable to remove availability:", error);
            setAvailabilityMessage(error.message || "Unable to remove availability.");
        } finally {
            setAvailabilityLoading(false);
        }
    };

    const statusBadge = (status) => (
        <span className={`dashboard-status dashboard-status-${status.toLowerCase()}`}>{status}</span>
    );

    const appointmentTable = (items, showActions = true) => (
        <div className="dashboard-table-wrap">
            <table className="dashboard-table">
                <thead><tr><th>Date &amp; time</th><th>Patient</th><th>Reason</th><th>Status</th>{showActions && <th>Action</th>}</tr></thead>
                <tbody>{items.map((appointment) => (
                    <tr key={appointment.id}>
                        <td>{appointment.appointmentDate}<small>{formatTime12Hour(appointment.appointmentTime)}</small></td>
                        <td>{appointment.patient?.name || "Patient"}<small>{appointment.patient?.email || ""}</small></td>
                        <td>{appointment.reason || "—"}</td>
                        <td>{statusBadge(appointment.status)}</td>
                        {showActions && <td className="dashboard-row-actions">
                            {appointment.status === "PENDING" && <>
                                <button type="button" className="dashboard-row-action" disabled={updatingId === appointment.id} onClick={() => void updateStatus(appointment.id, "CONFIRMED")}>Confirm</button>
                                <button type="button" className="dashboard-row-action dashboard-row-danger" disabled={updatingId === appointment.id} onClick={() => void updateStatus(appointment.id, "CANCELLED")}>Cancel</button>
                            </>}
                            {appointment.status === "CONFIRMED" && <>
                                {appointment.consultationType === "VIDEO" && (
                                    <a
                                        href={appointment.meetingUrl || `https://meet.jit.si/doc-appt-${appointment.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="dashboard-row-action"
                                        style={{ backgroundColor: '#3182ce', color: '#fff', textDecoration: 'none', display: 'inline-block' }}
                                    >
                                        Video 📹
                                    </a>
                                )}
                                <button
                                    type="button"
                                    className="dashboard-row-action"
                                    style={{ backgroundColor: '#2f855a', color: '#fff' }}
                                    disabled={updatingId === appointment.id}
                                    onClick={() => void updateStatus(appointment.id, "COMPLETED")}
                                >
                                    Complete ✅
                                </button>
                                <button type="button" className="dashboard-row-action dashboard-row-danger" disabled={updatingId === appointment.id} onClick={() => void updateStatus(appointment.id, "CANCELLED")}>Cancel</button>
                            </>}
                            {(appointment.status === "CONFIRMED" || appointment.status === "COMPLETED") && (
                                <button
                                    type="button"
                                    className="dashboard-row-action"
                                    style={{ backgroundColor: '#2b6cb0', color: '#fff' }}
                                    onClick={() => setRxAppointment(appointment)}
                                >
                                    Issue Rx 📋
                                </button>
                            )}
                        </td>}
                    </tr>
                ))}</tbody>
            </table>
            {items.length === 0 && <p className="dashboard-empty">No appointments to show.</p>}
        </div>
    );

    return (
        <div className="dashboard-layout dashboard-doctor">
            {rxAppointment && (
                <CreatePrescriptionModal
                    appointment={rxAppointment}
                    doctorId={doctor.id}
                    patientId={rxAppointment.patient?.id}
                    onClose={() => setRxAppointment(null)}
                    onSuccess={() => {
                        setMessage("Prescription issued successfully!");
                        setIsError(false);
                        loadPrescriptions();
                    }}
                />
            )}

            {viewRx && (
                <ViewPrescriptionModal
                    prescription={viewRx}
                    onClose={() => setViewRx(null)}
                />
            )}

            <aside className={`dashboard-sidebar ${mobileMenuOpen ? "dashboard-sidebar-open" : ""}`}>
                <div className="dashboard-brand"><span>+</span> Doctor Appointment</div>
                <p className="dashboard-sidebar-caption">DOCTOR PORTAL</p>
                <nav className="dashboard-side-nav" aria-label="Doctor navigation">
                    {sections.map((section) => <button type="button" key={section.id} className={activeSection === section.id ? "active" : ""} onClick={() => navigate(section.id)}>
                        <span className="dashboard-nav-icon">{section.icon}</span>{section.label}
                    </button>)}
                </nav>
                <button type="button" className="dashboard-side-logout" onClick={onLogout}><span className="dashboard-nav-icon">↪</span> Logout</button>
            </aside>

            <div className="dashboard-main">
                <header className="dashboard-topbar">
                    <button type="button" className="dashboard-menu-toggle" aria-label="Toggle navigation" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}>☰</button>
                    <div style={{ flex: 1 }}><span className="dashboard-topbar-label">Doctor workspace</span><strong>{doctor.name}</strong></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <NotificationBell user={{ id: doctor.id, email: doctor.email }} />
                        <div className="dashboard-avatar">{(doctor.name || "D").slice(0, 1).toUpperCase()}</div>
                    </div>
                </header>
                <main className="dashboard-content">
                    {message && <p className={isError ? "form-error" : "form-success"} role={isError ? "alert" : "status"}>{message}</p>}
                    <section className="dashboard-welcome">
                        <div><p className="dashboard-eyebrow">CARE THAT MAKES A DIFFERENCE</p><h1>Welcome, Dr. {doctor.name.replace(/^Dr\.?\s*/i, "")}!</h1><p>Here is your appointment and practice overview.</p></div>
                        <div className="dashboard-welcome-art" aria-hidden="true">✚</div>
                    </section>

                    {loading ? <div className="dashboard-empty">Loading your dashboard…</div> : <>
                        {activeSection === "dashboard" && <>
                            <section className="dashboard-stat-grid" aria-label="Doctor summary">
                                <article className="dashboard-stat stat-blue"><span>Total appointments</span><strong>{appointments.length}</strong><small>All assigned bookings</small></article>
                                <article className="dashboard-stat stat-green"><span>Confirmed</span><strong>{appointments.filter((item) => item.status === "CONFIRMED").length}</strong><small>Confirmed visits</small></article>
                                <article className="dashboard-stat stat-orange"><span>Pending</span><strong>{appointments.filter((item) => item.status === "PENDING").length}</strong><small>Awaiting your review</small></article>
                                <article className="dashboard-stat stat-purple"><span>Issued Prescriptions</span><strong>{prescriptions.length}</strong><small>Digital Rx records</small></article>
                            </section>
                            <section className="dashboard-panel">
                                <div className="dashboard-panel-heading"><div><p className="dashboard-eyebrow">TODAY</p><h2>Today’s appointments</h2></div><button type="button" className="dashboard-text-action" onClick={() => navigate("appointments")}>View all</button></div>
                                {appointmentTable(todayAppointments)}
                            </section>
                            <section className="dashboard-quick-actions">
                                <button type="button" onClick={() => navigate("queue")}><span>🔢</span><strong>Today's Queue</strong><small>Live patient visit queue</small></button>
                                <button type="button" onClick={() => navigate("appointments")}><span>▦</span><strong>View appointments</strong><small>Review and update visits</small></button>
                                <button type="button" onClick={() => navigate("patients")}><span>♧</span><strong>View my patients</strong><small>Patients from your appointments</small></button>
                                <button type="button" onClick={() => navigate("prescriptions")}><span>📋</span><strong>Issued prescriptions</strong><small>Review patient Rx records</small></button>
                            </section>
                            <section className="dashboard-panel dashboard-specialty-panel"><div><p className="dashboard-eyebrow">YOUR PRACTICE</p><h2>My specialization</h2><strong>{doctor.specialization || "Not provided"}</strong><p>{doctor.qualification || "Qualification not provided"}{doctor.experience != null ? ` · ${doctor.experience} years of experience` : ""}</p></div></section>
                        </>}

                        {activeSection === "queue" && (
                            <section className="dashboard-panel">
                                <div className="dashboard-panel-heading">
                                    <div>
                                        <p className="dashboard-eyebrow">LIVE CLINIC WORKFLOW</p>
                                        <h2>Today's Patient Queue</h2>
                                    </div>
                                    <button type="button" className="dashboard-text-action" disabled={queueLoading} onClick={() => void loadQueue()}>
                                        {queueLoading ? "Refreshing…" : "Refresh Queue 🔄"}
                                    </button>
                                </div>
                                <p className="dashboard-panel-description">
                                    Chronological live queue of scheduled patient visits for today.
                                </p>
                                <div className="dashboard-table-wrap">
                                    <table className="dashboard-table">
                                        <thead>
                                            <tr>
                                                <th>Queue #</th>
                                                <th>Time</th>
                                                <th>Patient</th>
                                                <th>Mode</th>
                                                <th>Payment</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {queue.map((item) => {
                                                const isVideo = item.consultationType === "VIDEO";
                                                const meetUrl = item.meetingUrl || `https://meet.jit.si/doc-appt-${item.appointmentId}`;
                                                return (
                                                    <tr key={item.appointmentId}>
                                                        <td>
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '4px 10px',
                                                                borderRadius: '12px',
                                                                backgroundColor: item.queueNumber === 1 ? '#e2e8f0' : '#edf2f7',
                                                                fontWeight: 'bold',
                                                                color: item.queueNumber === 1 ? '#2b6cb0' : '#4a5568'
                                                            }}>
                                                                #{item.queueNumber} {item.queueNumber === 1 ? '(Current)' : ''}
                                                            </span>
                                                        </td>
                                                        <td><strong>{formatTime12Hour(item.appointmentTime)}</strong></td>
                                                        <td>{item.patientName}<small>{item.patientEmail}</small></td>
                                                        <td>
                                                            <span style={{ fontSize: '0.8rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: isVideo ? '#ebf8ff' : '#f7fafc', color: isVideo ? '#2b6cb0' : '#4a5568', border: '1px solid #cbd5e0' }}>
                                                                {isVideo ? '📹 Video' : '🏢 In-Person'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span style={{ color: item.paymentStatus === 'PAID' ? '#276749' : '#d69e2e', fontWeight: '600', fontSize: '0.85rem' }}>
                                                                {item.paymentStatus === 'PAID' ? 'Paid ✓' : 'Pending ⏳'}
                                                            </span>
                                                        </td>
                                                        <td>{statusBadge(item.status)}</td>
                                                        <td className="dashboard-row-actions">
                                                            {isVideo && (
                                                                <a
                                                                    href={meetUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="dashboard-row-action"
                                                                    style={{ backgroundColor: '#3182ce', color: '#fff', textDecoration: 'none', display: 'inline-block' }}
                                                                >
                                                                    Join Call 📹
                                                                </a>
                                                            )}
                                                            {item.status !== "COMPLETED" && (
                                                                <button
                                                                    type="button"
                                                                    className="dashboard-row-action"
                                                                    style={{ backgroundColor: '#2f855a', color: '#fff' }}
                                                                    disabled={updatingId === item.appointmentId}
                                                                    onClick={async () => {
                                                                        await updateStatus(item.appointmentId, "COMPLETED");
                                                                        await loadQueue();
                                                                    }}
                                                                >
                                                                    Complete ✅
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                className="dashboard-row-action"
                                                                style={{ backgroundColor: '#2b6cb0', color: '#fff' }}
                                                                onClick={() => {
                                                                    const app = appointments.find((a) => a.id === item.appointmentId) || {
                                                                        id: item.appointmentId,
                                                                        patient: { name: item.patientName, email: item.patientEmail }
                                                                    };
                                                                    setRxAppointment(app);
                                                                }}
                                                            >
                                                                Rx 📋
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {queue.length === 0 && <p className="dashboard-empty">No active patients in the queue for today.</p>}
                                </div>
                            </section>
                        )}

                        {activeSection === "appointments" && <section className="dashboard-panel">
                            <div className="dashboard-panel-heading"><div><p className="dashboard-eyebrow">YOUR SCHEDULE</p><h2>My appointments</h2></div><button type="button" className="dashboard-text-action" onClick={() => void loadAppointments()}>Refresh</button></div>
                            {appointmentTable(appointments)}
                        </section>}

                        {activeSection === "patients" && <section className="dashboard-panel">
                            <div className="dashboard-panel-heading"><div><p className="dashboard-eyebrow">CARE TEAM</p><h2>My patients</h2></div><span>{patients.length} patients</span></div>
                            {patients.length === 0 ? <p className="dashboard-empty">Patients will appear here after appointments are booked.</p> : <div className="dashboard-doctor-grid">{patients.map((patient) => <article className="dashboard-doctor-card" key={patient.id}><div className="dashboard-doctor-avatar">♧</div><h3>{patient.name}</h3><p className="dashboard-doctor-specialty">{patient.email}</p><p>{patient.phone || "Phone not provided"}</p></article>)}</div>}
                        </section>}

                        {activeSection === "prescriptions" && <section className="dashboard-panel">
                            <div className="dashboard-panel-heading"><div><p className="dashboard-eyebrow">MEDICAL RECORDS</p><h2>Issued prescriptions</h2></div><button type="button" className="dashboard-text-action" onClick={() => void loadPrescriptions()}>Refresh</button></div>
                            <div className="dashboard-table-wrap">
                                <table className="dashboard-table">
                                    <thead><tr><th>Date</th><th>Patient</th><th>Diagnosis</th><th>Medicines</th><th>Action</th></tr></thead>
                                    <tbody>
                                        {prescriptions.map((rx) => (
                                            <tr key={rx.id}>
                                                <td>{new Date(rx.createdAt).toLocaleDateString()}</td>
                                                <td>{rx.patient ? rx.patient.name : 'N/A'}<small>{rx.patient ? rx.patient.email : ''}</small></td>
                                                <td><strong>{rx.diagnosis}</strong></td>
                                                <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rx.medicines}</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="dashboard-row-action"
                                                        onClick={() => setViewRx(rx)}
                                                    >
                                                        View / Print 🖨️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {prescriptions.length === 0 && <p className="dashboard-empty">No prescriptions issued yet.</p>}
                            </div>
                        </section>}

                        {activeSection === "reviews" && (
                            <section className="dashboard-panel">
                                <div className="dashboard-panel-heading">
                                    <div>
                                        <p className="dashboard-eyebrow">PATIENT FEEDBACK</p>
                                        <h2>Reviews &amp; Ratings</h2>
                                    </div>
                                    <button type="button" className="dashboard-text-action" disabled={reviewsLoading} onClick={() => void loadReviews()}>
                                        {reviewsLoading ? "Refreshing…" : "Refresh"}
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', padding: '16px 20px', backgroundColor: '#fffaf0', border: '1px solid #fbd38d', borderRadius: '10px', marginBottom: '20px' }}>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#d69e2e', lineHeight: 1 }}>
                                        ⭐ {doctorProfile.rating != null && doctorProfile.rating > 0 ? doctorProfile.rating.toFixed(1) : (doctorReviews.length > 0 ? (doctorReviews.reduce((acc, r) => acc + r.rating, 0) / doctorReviews.length).toFixed(1) : "5.0")}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#744210' }}>
                                            Average Doctor Rating
                                        </div>
                                        <div style={{ color: '#975a16', fontSize: '0.88rem' }}>
                                            Based on {doctorReviews.length} verified patient {doctorReviews.length === 1 ? 'review' : 'reviews'}
                                        </div>
                                    </div>
                                </div>

                                {doctorReviews.length === 0 ? (
                                    <p className="dashboard-empty">No patient reviews yet. Patients can submit ratings and reviews after their consultation is completed.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        {doctorReviews.map((rev) => (
                                            <article
                                                key={rev.id}
                                                style={{
                                                    padding: '16px 18px',
                                                    backgroundColor: '#fff',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <div>
                                                        <span style={{ fontWeight: 700, color: '#2d3748', fontSize: '0.95rem' }}>
                                                            {rev.patient ? rev.patient.name : 'Verified Patient'}
                                                        </span>
                                                        <span style={{ color: '#d69e2e', marginLeft: '10px', fontSize: '1rem' }}>
                                                            {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                                                        </span>
                                                    </div>
                                                    <span style={{ fontSize: '0.8rem', color: '#718096' }}>
                                                        {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : ''}
                                                    </span>
                                                </div>
                                                <p style={{ margin: 0, color: '#4a5568', fontSize: '0.92rem', lineHeight: '1.45' }}>
                                                    "{rev.comment || 'No written comment'}"
                                                </p>
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}

                        {activeSection === "profile" && <section className="dashboard-panel dashboard-profile-panel">
                            <div className="dashboard-panel-heading"><div><p className="dashboard-eyebrow">ACCOUNT &amp; PRICING</p><h2>Profile &amp; Consultation Fee</h2></div></div>
                            <dl className="dashboard-profile-details">
                                <div><dt>Name</dt><dd>{doctorProfile.name}</dd></div>
                                <div><dt>Email</dt><dd>{doctorProfile.email}</dd></div>
                                <div><dt>Phone</dt><dd>{doctorProfile.phone}</dd></div>
                                <div><dt>Specialization</dt><dd>{doctorProfile.specialization}</dd></div>
                                <div><dt>Qualification</dt><dd>{doctorProfile.qualification}</dd></div>
                                <div><dt>Experience</dt><dd>{doctorProfile.experience} years</dd></div>
                                <div><dt>Consultation Fee</dt><dd><strong style={{ color: '#2b6cb0', fontSize: '1.05rem' }}>₹{doctorProfile.consultationFee || 500}</strong></dd></div>
                            </dl>

                            <div style={{ marginTop: '24px', padding: '18px 20px', backgroundColor: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <h3 style={{ fontSize: '1rem', color: '#2b6cb0', margin: '0 0 6px 0' }}>💰 Set Consultation Fee</h3>
                                <p style={{ fontSize: '0.85rem', color: '#4a5568', margin: '0 0 14px 0' }}>
                                    Set the consultation fee charged to patients for booking appointments with you.
                                </p>
                                <form onSubmit={handleSaveFee} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem', color: '#2d3748' }}>
                                        Fee (₹):
                                        <input
                                            type="number"
                                            min="0"
                                            step="50"
                                            required
                                            value={consultationFeeInput}
                                            onChange={(e) => setConsultationFeeInput(e.target.value)}
                                            style={{ width: '130px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.95rem' }}
                                        />
                                    </label>
                                    <button
                                        type="submit"
                                        disabled={feeSaving}
                                        style={{
                                            padding: '8px 18px',
                                            backgroundColor: '#2f855a',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        {feeSaving ? "Saving…" : "Save Consultation Fee"}
                                    </button>
                                </form>
                            </div>
                        </section>}

                        {activeSection === "availability" && <section className="dashboard-panel">
                            <div className="dashboard-panel-heading"><div><p className="dashboard-eyebrow">SCHEDULING</p><h2>Weekly availability</h2></div><button type="button" className="dashboard-text-action" disabled={availabilityLoading} onClick={() => void loadAvailabilities()}>Refresh</button></div>
                            <p className="dashboard-panel-description">Bookings are restricted to these windows when you add availability. With no windows configured, booking is unrestricted.</p>
                            <form className="dashboard-availability-form" onSubmit={saveAvailability}>
                                <label>Day<select value={availabilityForm.dayOfWeek} onChange={(event) => setAvailabilityForm({ ...availabilityForm, dayOfWeek: event.target.value })}>{["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((day) => <option key={day}>{day}</option>)}</select></label>
                                <label>Start time: <strong>{availabilityForm.startTime ? formatTime12Hour(availabilityForm.startTime) : "12-hour AM/PM"}</strong><input type="time" required value={availabilityForm.startTime} onChange={(event) => setAvailabilityForm({ ...availabilityForm, startTime: event.target.value })} /></label>
                                <label>End time: <strong>{availabilityForm.endTime ? formatTime12Hour(availabilityForm.endTime) : "12-hour AM/PM"}</strong><input type="time" required value={availabilityForm.endTime} onChange={(event) => setAvailabilityForm({ ...availabilityForm, endTime: event.target.value })} /></label>
                                <button type="submit" disabled={availabilityLoading}>{availabilityLoading ? "Saving…" : "Add availability"}</button>
                            </form>
                            {availabilityMessage && <p className="dashboard-inline-message" role="status">{availabilityMessage}</p>}
                            {availabilities.length === 0 ? <p className="dashboard-empty">No weekly availability windows configured.</p> : <ul className="dashboard-availability-list">{availabilities.map((slot) => <li key={slot.id}><span><strong>{slot.dayOfWeek}</strong> {formatTime12Hour(slot.startTime)} – {formatTime12Hour(slot.endTime)}</span><button type="button" className="dashboard-row-action dashboard-row-danger" disabled={availabilityLoading} onClick={() => void deleteAvailability(slot.id)}>Remove</button></li>)}</ul>}
                        </section>}
                    </>}
                </main>
            </div>
        </div>
    );
}

export default DoctorDashboard;
