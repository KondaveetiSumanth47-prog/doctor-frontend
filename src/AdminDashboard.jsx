import { useEffect, useState } from "react";
import { apiRequest } from "./api";
import PasswordInput from "./PasswordInput";
import { formatTime12Hour } from "./utils";
import "./App.css";

const sections = [
    { id: "dashboard", label: "Dashboard", icon: "⌂" },
    { id: "analytics", label: "Analytics & Trends", icon: "📊" },
    { id: "patients", label: "Manage Patients", icon: "♧" },
    { id: "doctors", label: "Manage Doctors", icon: "+" },
    { id: "appointments", label: "Appointments", icon: "▦" },
];

const SPECIALIZATIONS = [
    "Cardiology",
    "Dermatology",
    "Endocrinology",
    "ENT (Ear, Nose, Throat)",
    "Gastroenterology",
    "General Medicine",
    "General Surgery",
    "Neurology",
    "Obstetrics & Gynecology",
    "Oncology",
    "Ophthalmology",
    "Orthopedics",
    "Pediatrics",
    "Psychiatry",
    "Pulmonology",
    "Radiology",
    "Urology",
];

const QUALIFICATIONS = [
    "MBBS",
    "MBBS, MD",
    "MBBS, MS",
    "MBBS, DNB",
    "MD (Doctor of Medicine)",
    "MS (Master of Surgery)",
    "DNB (Diplomate of National Board)",
    "DM (Doctorate of Medicine)",
    "MCh (Master of Chirurgiae)",
    "FRCP / FRCS",
];

function AdminDashboard({ onLogout }) {
    const [patients, setPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [verifyingId, setVerifyingId] = useState(null);
    const [activeSection, setActiveSection] = useState("dashboard");
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [busyAction, setBusyAction] = useState("");
    const [newDoctor, setNewDoctor] = useState({
        name: "",
        email: "",
        phone: "",
        specialization: "",
        qualification: "",
        experience: "",
        consultationFee: "500",
        password: "",
    });
    const [doctorPasswords, setDoctorPasswords] = useState({});
    const [patientPasswords, setPatientPasswords] = useState({});

    const loadAnalytics = async () => {
        setAnalyticsLoading(true);
        try {
            const data = await apiRequest("/admin/analytics");
            setAnalytics(data);
        } catch (err) {
            console.error("Unable to load admin analytics:", err);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const toggleVerification = async (doctorId, newStatus) => {
        setVerifyingId(doctorId);
        setErrorMessage("");
        setSuccessMessage("");
        try {
            const updated = await apiRequest(`/doctors/${doctorId}/verification?status=${newStatus}`, {
                method: "PUT",
            });
            setDoctors((current) => current.map((d) => d.id === doctorId ? updated : d));
            setSuccessMessage(`Doctor ${updated.name} verification status updated to ${newStatus}.`);
            void loadAnalytics();
        } catch (err) {
            console.error("Failed to update verification:", err);
            setErrorMessage(err.message || "Failed to update doctor verification status.");
        } finally {
            setVerifyingId(null);
        }
    };

    const loadAll = async () => {
        setLoading(true);
        setErrorMessage("");
        const [patientResult, doctorResult, appointmentResult, analyticsResult] = await Promise.allSettled([
            apiRequest("/patients"),
            apiRequest("/doctors"),
            apiRequest("/appointments"),
            apiRequest("/admin/analytics"),
        ]);
        if (patientResult.status === "fulfilled") {
            setPatients(patientResult.value);
        }
        if (doctorResult.status === "fulfilled") {
            setDoctors(doctorResult.value);
        }
        if (appointmentResult.status === "fulfilled") {
            setAppointments(appointmentResult.value);
        }
        if (analyticsResult.status === "fulfilled") {
            setAnalytics(analyticsResult.value);
        }
        const rejected = [patientResult, doctorResult, appointmentResult]
            .filter((result) => result.status === "rejected");
        if (rejected.length) {
            console.error("Unable to load all admin dashboard data:", rejected);
            setErrorMessage(rejected.map((result) => result.reason?.message || "A dashboard request failed.").join(" "));
        }
        setLoading(false);
    };

    useEffect(() => {
        let active = true;
        Promise.allSettled([
            apiRequest("/patients"),
            apiRequest("/doctors"),
            apiRequest("/appointments"),
            apiRequest("/admin/analytics"),
        ]).then(([patientResult, doctorResult, appointmentResult, analyticsResult]) => {
            if (!active) {
                return;
            }
            if (patientResult.status === "fulfilled") {
                setPatients(patientResult.value);
            }
            if (doctorResult.status === "fulfilled") {
                setDoctors(doctorResult.value);
            }
            if (appointmentResult.status === "fulfilled") {
                setAppointments(appointmentResult.value);
            }
            if (analyticsResult.status === "fulfilled") {
                setAnalytics(analyticsResult.value);
            }
            const rejected = [patientResult, doctorResult, appointmentResult]
                .filter((result) => result.status === "rejected");
            if (rejected.length) {
                console.error("Unable to load all admin dashboard data:", rejected);
                setErrorMessage(rejected.map((result) => result.reason?.message || "A dashboard request failed.").join(" "));
            }
            setLoading(false);
        });
        return () => {
            active = false;
        };
    }, []);

    const navigate = (section) => {
        setActiveSection(section);
        setMobileMenuOpen(false);
        setErrorMessage("");
        setSuccessMessage("");
    };

    const createDoctor = async (event) => {
        event.preventDefault();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newDoctor.email.trim())) {
            setErrorMessage("Please enter a valid email address.");
            return;
        }

        const cleanedPhone = newDoctor.phone.replace(/\D/g, "");
        if (cleanedPhone.length !== 10) {
            setErrorMessage("Doctor phone number must be exactly 10 digits.");
            return;
        }

        setBusyAction("create-doctor");
        setErrorMessage("");
        setSuccessMessage("");
        try {
            await apiRequest("/doctors", {
                method: "POST",
                body: JSON.stringify({
                    ...newDoctor,
                    email: newDoctor.email.trim(),
                    phone: cleanedPhone,
                    experience: Number(newDoctor.experience),
                    consultationFee: Number(newDoctor.consultationFee || 500),
                }),
            });
            setNewDoctor({ name: "", email: "", phone: "", specialization: "", qualification: "", experience: "", consultationFee: "500", password: "" });
            await loadAll();
            setSuccessMessage("Doctor account created successfully.");
            setActiveSection("doctors");
        } catch (error) {
            console.error("Unable to create doctor:", error);
            setErrorMessage(error.message || "Unable to create doctor.");
        } finally {
            setBusyAction("");
        }
    };

    const savePassword = async (event, kind, id) => {
        event.preventDefault();
        const key = `${kind}-${id}`;
        setBusyAction(key);
        setErrorMessage("");
        setSuccessMessage("");
        try {
            await apiRequest(`/${kind}s/${id}/credentials`, {
                method: "POST",
                body: JSON.stringify({
                    password: kind === "doctor" ? doctorPasswords[id] ?? "" : patientPasswords[id] ?? "",
                }),
            });
            if (kind === "doctor") {
                setDoctorPasswords((current) => ({ ...current, [id]: "" }));
            } else {
                setPatientPasswords((current) => ({ ...current, [id]: "" }));
            }
            setSuccessMessage(`${kind === "doctor" ? "Doctor" : "Patient"} sign-in password saved.`);
        } catch (error) {
            console.error(`Unable to save ${kind} credentials:`, error);
            setErrorMessage(error.message || `Unable to save ${kind} credentials.`);
        } finally {
            setBusyAction("");
        }
    };

    const statusBadge = (status) => (
        <span className={`dashboard-status dashboard-status-${status.toLowerCase()}`}>{status}</span>
    );

    const handleExportCsv = async () => {
        try {
            const response = await fetch("/api/appointments/export/csv", {
                credentials: "include"
            });
            if (!response.ok) throw new Error("Failed to export CSV");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "appointments_report.csv";
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            console.error("Export failed:", err);
            setErrorMessage(err.message || "Failed to export appointments report.");
        }
    };

    return (
        <div className="dashboard-layout dashboard-admin">
            <aside className={`dashboard-sidebar ${mobileMenuOpen ? "dashboard-sidebar-open" : ""}`}>
                <div className="dashboard-brand"><span>+</span> Doctor Appointment</div>
                <p className="dashboard-sidebar-caption">ADMIN PORTAL</p>
                <nav className="dashboard-side-nav" aria-label="Admin navigation">
                    {sections.map((section) => <button type="button" key={section.id} className={activeSection === section.id ? "active" : ""} onClick={() => navigate(section.id)}>
                        <span className="dashboard-nav-icon">{section.icon}</span>{section.label}
                    </button>)}
                </nav>
                <button type="button" className="dashboard-side-logout" onClick={onLogout}><span className="dashboard-nav-icon">↪</span> Logout</button>
            </aside>

            <div className="dashboard-main">
                <header className="dashboard-topbar">
                    <button type="button" className="dashboard-menu-toggle" aria-label="Toggle navigation" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}>☰</button>
                    <div style={{ flex: 1 }}><span className="dashboard-topbar-label">Administration workspace</span><strong>Administrator</strong></div>
                    <div className="dashboard-avatar">A</div>
                </header>
                <main className="dashboard-content">
                    {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
                    {successMessage && <p className="form-success" role="status">{successMessage}</p>}
                    <section className="dashboard-welcome">
                        <div><p className="dashboard-eyebrow">SYSTEM OVERVIEW</p><h1>Welcome, Admin!</h1><p>Manage patients, doctors, and appointments from one workspace.</p></div>
                        <div className="dashboard-welcome-art" aria-hidden="true">✚</div>
                    </section>

                    {loading ? <div className="dashboard-empty">Loading administration data…</div> : <>
                        {activeSection === "dashboard" && <>
                            <section className="dashboard-stat-grid" aria-label="Administration summary">
                                <article className="dashboard-stat stat-blue"><span>Total patients</span><strong>{patients.length}</strong><small>Registered accounts</small></article>
                                <article className="dashboard-stat stat-green"><span>Total doctors</span><strong>{doctors.length}</strong><small>Doctor directory</small></article>
                                <article className="dashboard-stat stat-purple"><span>Total appointments</span><strong>{appointments.length}</strong><small>All booking records</small></article>
                                <article className="dashboard-stat stat-orange"><span>Pending appointments</span><strong>{appointments.filter((item) => item.status === "PENDING").length}</strong><small>Awaiting confirmation</small></article>
                            </section>
                            <section className="dashboard-panel">
                                <div className="dashboard-panel-heading"><div><p className="dashboard-eyebrow">RECENT ACTIVITY</p><h2>Recent patients</h2></div><button type="button" className="dashboard-text-action" onClick={() => navigate("patients")}>View all</button></div>
                                <div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th></tr></thead><tbody>{patients.slice(-5).reverse().map((patient) => <tr key={patient.id}><td>{patient.name}</td><td>{patient.email}</td><td>{patient.phone || "—"}</td></tr>)}</tbody></table>{patients.length === 0 && <p className="dashboard-empty">No patients have registered yet.</p>}</div>
                            </section>
                            <section className="dashboard-panel">
                                <div className="dashboard-panel-heading"><div><p className="dashboard-eyebrow">SCHEDULE OVERVIEW</p><h2>Recent appointments</h2></div><button type="button" className="dashboard-text-action" onClick={() => navigate("appointments")}>View all</button></div>
                                <div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr><th>Patient</th><th>Doctor</th><th>Date &amp; time</th><th>Status</th></tr></thead><tbody>{appointments.slice(-5).reverse().map((appointment) => <tr key={appointment.id}><td>{appointment.patient?.name || "Patient"}</td><td>{appointment.doctor?.name || "Doctor"}</td><td>{appointment.appointmentDate}<small>{formatTime12Hour(appointment.appointmentTime)}</small></td><td>{statusBadge(appointment.status)}</td></tr>)}</tbody></table>{appointments.length === 0 && <p className="dashboard-empty">No appointments have been booked yet.</p>}</div>
                            </section>
                            <section className="dashboard-quick-actions">
                                <button type="button" onClick={() => navigate("analytics")}><span>📊</span><strong>System Analytics</strong><small>KPI metrics &amp; specialty trends</small></button>
                                <button type="button" onClick={() => navigate("patients")}><span>♧</span><strong>View all patients</strong><small>Review registered accounts</small></button>
                                <button type="button" onClick={() => navigate("doctors")}><span>＋</span><strong>Manage doctors</strong><small>Create and verify doctor accounts</small></button>
                                <button type="button" onClick={() => navigate("appointments")}><span>▦</span><strong>View appointments</strong><small>Review the booking schedule</small></button>
                            </section>
                        </>}

                        {activeSection === "analytics" && (
                            <section className="dashboard-panel">
                                <div className="dashboard-panel-heading">
                                    <div>
                                        <p className="dashboard-eyebrow">SYSTEM INTELLIGENCE</p>
                                        <h2>Practice Analytics &amp; Trends</h2>
                                    </div>
                                    <button type="button" className="dashboard-text-action" disabled={analyticsLoading} onClick={() => void loadAnalytics()}>
                                        {analyticsLoading ? "Refreshing…" : "Refresh Analytics 🔄"}
                                    </button>
                                </div>
                                <div className="dashboard-stat-grid" style={{ marginBottom: '24px' }}>
                                    <article className="dashboard-stat stat-blue">
                                        <span>Total Patients</span>
                                        <strong>{analytics?.totalPatients ?? patients.length}</strong>
                                        <small>Registered patients</small>
                                    </article>
                                    <article className="dashboard-stat stat-green">
                                        <span>Verified Doctors</span>
                                        <strong>{analytics?.approvedDoctors ?? doctors.filter(d => d.verificationStatus === 'APPROVED').length} / {analytics?.totalDoctors ?? doctors.length}</strong>
                                        <small>{analytics?.pendingDoctors ?? 0} pending review</small>
                                    </article>
                                    <article className="dashboard-stat stat-purple">
                                        <span>Total Bookings</span>
                                        <strong>{analytics?.totalAppointments ?? appointments.length}</strong>
                                        <small>{analytics?.completedAppointments ?? appointments.filter(a => a.status === 'COMPLETED').length} visits completed</small>
                                    </article>
                                    <article className="dashboard-stat stat-orange">
                                        <span>Pending Confirmations</span>
                                        <strong>{analytics?.pendingAppointments ?? appointments.filter(a => a.status === 'PENDING').length}</strong>
                                        <small>{analytics?.cancelledAppointments ?? appointments.filter(a => a.status === 'CANCELLED').length} cancelled</small>
                                    </article>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                                    <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px' }}>
                                        <h3 style={{ fontSize: '1rem', color: '#2b6cb0', marginBottom: '14px' }}>🩺 Appointments by Medical Specialization</h3>
                                        {analytics?.specialtyDistribution && Object.keys(analytics.specialtyDistribution).length > 0 ? (
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                {Object.entries(analytics.specialtyDistribution).map(([spec, count]) => {
                                                    const pct = Math.round((count / (analytics.totalAppointments || 1)) * 100);
                                                    return (
                                                        <li key={spec} style={{ marginBottom: '12px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '4px' }}>
                                                                <strong>{spec}</strong>
                                                                <span>{count} ({pct}%)</span>
                                                            </div>
                                                            <div style={{ width: '100%', height: '8px', backgroundColor: '#edf2f7', borderRadius: '4px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#3182ce', borderRadius: '4px' }} />
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        ) : (
                                            <p className="dashboard-empty">No specialty distribution data available.</p>
                                        )}
                                    </div>

                                    <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px' }}>
                                        <h3 style={{ fontSize: '1rem', color: '#2b6cb0', marginBottom: '14px' }}>📅 Monthly Booking Trends</h3>
                                        {analytics?.monthlyTrends && Object.keys(analytics.monthlyTrends).length > 0 ? (
                                            <div className="dashboard-table-wrap">
                                                <table className="dashboard-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Month</th>
                                                            <th>Appointments</th>
                                                            <th>Volume</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {Object.entries(analytics.monthlyTrends).map(([month, count]) => (
                                                            <tr key={month}>
                                                                <td><strong>{month}</strong></td>
                                                                <td>{count} appointments</td>
                                                                <td>
                                                                    <span style={{ display: 'inline-block', width: `${Math.min(100, count * 15)}px`, height: '8px', backgroundColor: '#38a169', borderRadius: '4px' }} />
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="dashboard-empty">No monthly trend data available.</p>
                                        )}
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeSection === "patients" && <section className="dashboard-panel">
                            <div className="dashboard-panel-heading"><div><p className="dashboard-eyebrow">PATIENT DIRECTORY</p><h2>Manage patients</h2></div><span>{patients.length} patients</span></div>
                            <div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Account access</th></tr></thead><tbody>{patients.map((patient) => <tr key={patient.id}><td>{patient.name}</td><td>{patient.email}</td><td>{patient.phone || "—"}</td><td><form className="dashboard-inline-form" onSubmit={(event) => void savePassword(event, "patient", patient.id)}><PasswordInput autoComplete="new-password" aria-label={`Set password for ${patient.name}`} placeholder="Set/reset password" minLength={4} value={patientPasswords[patient.id] ?? ""} onChange={(event) => setPatientPasswords({ ...patientPasswords, [patient.id]: event.target.value })} required /><button type="submit" disabled={busyAction === `patient-${patient.id}`}>{busyAction === `patient-${patient.id}` ? "Saving…" : "Save"}</button></form></td></tr>)}</tbody></table>{patients.length === 0 && <p className="dashboard-empty">No patients have registered yet.</p>}</div>
                        </section>}

                        {activeSection === "doctors" && <>
                            <section className="dashboard-panel">
                                <div className="dashboard-panel-heading"><div><p className="dashboard-eyebrow">DOCTOR DIRECTORY</p><h2>Manage doctors</h2></div><span>{doctors.length} doctors</span></div>
                                <div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr><th>Name</th><th>Specialization</th><th>Fee</th><th>Email</th><th>Experience</th><th>Verification</th><th>Account access</th></tr></thead><tbody>{doctors.map((doctor) => <tr key={doctor.id}><td>{doctor.name}<small>{doctor.qualification || "Qualification not provided"}</small></td><td>{doctor.specialization}</td><td><strong style={{ color: '#2b6cb0' }}>₹{doctor.consultationFee || 500}</strong></td><td>{doctor.email}</td><td>{doctor.experience} years</td><td><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold', backgroundColor: doctor.verificationStatus === 'APPROVED' ? '#c6f6d5' : doctor.verificationStatus === 'REJECTED' ? '#fed7d7' : '#feebc8', color: doctor.verificationStatus === 'APPROVED' ? '#22543d' : doctor.verificationStatus === 'REJECTED' ? '#742a2a' : '#744210' }}>{doctor.verificationStatus || 'APPROVED'}</span>{doctor.verificationStatus === 'APPROVED' ? (<button type="button" className="dashboard-row-action dashboard-row-danger" disabled={verifyingId === doctor.id} onClick={() => void toggleVerification(doctor.id, 'REJECTED')} style={{ fontSize: '0.75rem', padding: '3px 8px' }}>{verifyingId === doctor.id ? '…' : 'Revoke 🚫'}</button>) : (<button type="button" className="dashboard-row-action" disabled={verifyingId === doctor.id} onClick={() => void toggleVerification(doctor.id, 'APPROVED')} style={{ backgroundColor: '#2f855a', color: '#fff', fontSize: '0.75rem', padding: '3px 8px' }}>{verifyingId === doctor.id ? '…' : 'Approve ✅'}</button>)}</div></td><td><form className="dashboard-inline-form" onSubmit={(event) => void savePassword(event, "doctor", doctor.id)}><PasswordInput autoComplete="new-password" aria-label={`Set password for ${doctor.name}`} placeholder="Set/reset password" minLength={4} value={doctorPasswords[doctor.id] ?? ""} onChange={(event) => setDoctorPasswords({ ...doctorPasswords, [doctor.id]: event.target.value })} required /><button type="submit" disabled={busyAction === `doctor-${doctor.id}`}>{busyAction === `doctor-${doctor.id}` ? "Saving…" : "Save"}</button></form></td></tr>)}</tbody></table>{doctors.length === 0 && <p className="dashboard-empty">No doctors have been added yet.</p>}</div>
                            </section>
                            <section className="dashboard-panel">
                                <div className="dashboard-panel-heading"><div><p className="dashboard-eyebrow">NEW PROVIDER</p><h2>Create doctor account</h2></div></div>
                                <form className="dashboard-admin-form" onSubmit={createDoctor}>
                                    <label>Full name<input required maxLength="120" value={newDoctor.name} onChange={(event) => setNewDoctor({ ...newDoctor, name: event.target.value })} /></label>
                                    <label>Email<input type="email" required placeholder="doctor@example.com" value={newDoctor.email} onChange={(event) => setNewDoctor({ ...newDoctor, email: event.target.value })} /></label>
                                    <label>Phone (10 digits)
                                        <input
                                            type="tel"
                                            required
                                            maxLength="10"
                                            pattern="[0-9]{10}"
                                            placeholder="10-digit mobile number"
                                            value={newDoctor.phone}
                                            onChange={(event) => setNewDoctor({
                                                ...newDoctor,
                                                phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                                            })}
                                        />
                                    </label>
                                    <label>Specialization
                                        <select
                                            required
                                            value={newDoctor.specialization}
                                            onChange={(event) => setNewDoctor({ ...newDoctor, specialization: event.target.value })}
                                        >
                                            <option value="">Select Specialization</option>
                                            {SPECIALIZATIONS.map((spec) => (
                                                <option key={spec} value={spec}>{spec}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label>Qualification
                                        <select
                                            required
                                            value={newDoctor.qualification}
                                            onChange={(event) => setNewDoctor({ ...newDoctor, qualification: event.target.value })}
                                        >
                                            <option value="">Select Qualification</option>
                                            {QUALIFICATIONS.map((qual) => (
                                                <option key={qual} value={qual}>{qual}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label>Years of experience<input type="number" min="0" required value={newDoctor.experience} onChange={(event) => setNewDoctor({ ...newDoctor, experience: event.target.value })} /></label>
                                    <label>Consultation Fee (₹)<input type="number" min="0" step="50" required value={newDoctor.consultationFee} onChange={(event) => setNewDoctor({ ...newDoctor, consultationFee: event.target.value })} placeholder="500" /></label>
                                    <label>Initial password<PasswordInput autoComplete="new-password" required minLength={4} value={newDoctor.password} onChange={(event) => setNewDoctor({ ...newDoctor, password: event.target.value })} /></label>
                                    <button type="submit" disabled={busyAction === "create-doctor"}>{busyAction === "create-doctor" ? "Creating…" : "Create doctor account"}</button>
                                </form>
                            </section>
                        </>}

                        {activeSection === "appointments" && <section className="dashboard-panel">
                            <div className="dashboard-panel-heading">
                                <div><p className="dashboard-eyebrow">BOOKING RECORDS</p><h2>All appointments</h2></div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button type="button" className="dashboard-text-action" onClick={handleExportCsv}>Export CSV Report 📥</button>
                                    <button type="button" className="dashboard-text-action" onClick={() => void loadAll()}>Refresh</button>
                                </div>
                            </div>
                            <div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr><th>Patient</th><th>Doctor</th><th>Specialization</th><th>Date &amp; time</th><th>Reason</th><th>Status</th></tr></thead><tbody>{appointments.map((appointment) => <tr key={appointment.id}><td>{appointment.patient?.name || "Patient"}<small>{appointment.patient?.email || ""}</small></td><td>{appointment.doctor?.name || "Doctor"}</td><td>{appointment.doctor?.specialization || "—"}</td><td>{appointment.appointmentDate}<small>{formatTime12Hour(appointment.appointmentTime)}</small></td><td>{appointment.reason || "—"}</td><td>{statusBadge(appointment.status)}</td></tr>)}</tbody></table>{appointments.length === 0 && <p className="dashboard-empty">No appointments have been booked yet.</p>}</div>
                        </section>}
                    </>}
                </main>
            </div>
        </div>
    );
}

export default AdminDashboard;
