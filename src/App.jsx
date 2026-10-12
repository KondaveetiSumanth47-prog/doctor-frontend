import { useEffect, useState } from "react";
import "./App.css";
import { apiFetch, apiRequest, resetCsrfToken } from "./api";

import PatientDashboard from "./PatientDashboard";
import DoctorDashboard from "./DoctorDashboard";
import AdminDashboard from "./AdminDashboard";
import PasswordInput from "./PasswordInput";

function ThemeToggle({ theme, toggleTheme }) {
    return (
        <button
            onClick={toggleTheme}
            style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: theme === 'dark' ? '#f59e0b' : '#1e293b',
                color: '#ffffff',
                border: '2px solid #ffffff',
                boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                fontSize: '1.4rem',
                cursor: 'pointer',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease-in-out'
            }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
        >
            {theme === 'dark' ? '☀️' : '🌙'}
        </button>
    );
}

function App() {
    const [page, setPage] = useState("home");
    const [theme, setTheme] = useState(() => localStorage.getItem("app-theme") || "light");

    useEffect(() => {
        if (theme === "dark") {
            document.body.classList.add("dark-theme");
        } else {
            document.body.classList.remove("dark-theme");
        }
        localStorage.setItem("app-theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === "light" ? "dark" : "light");
    };

    const [loggedInPatient, setLoggedInPatient] = useState(null);
    const [loggedInDoctor, setLoggedInDoctor] = useState(null);
    const [loggedInAdmin, setLoggedInAdmin] = useState(null);

    const [patientName, setPatientName] = useState("");
    const [patientEmail, setPatientEmail] = useState("");
    const [patientPhone, setPatientPhone] = useState("");
    const [patientDateOfBirth, setPatientDateOfBirth] = useState("");
    const [patientGender, setPatientGender] = useState("");
    const [patientPassword, setPatientPassword] = useState("");

    const [loginEmail, setLoginEmail] = useState("");
    const [patientLoginPassword, setPatientLoginPassword] = useState("");
    const [doctorEmail, setDoctorEmail] = useState("");
    const [doctorPassword, setDoctorPassword] = useState("");

    const [adminEmail, setAdminEmail] = useState("");
    const [adminPassword, setAdminPassword] = useState("");
    const [adminRegName, setAdminRegName] = useState("");
    const [adminRegEmail, setAdminRegEmail] = useState("");
    const [adminRegPassword, setAdminRegPassword] = useState("");

    const [forgotStep, setForgotStep] = useState(1);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotVerificationCode, setForgotVerificationCode] = useState("");
    const [forgotNewPassword, setForgotNewPassword] = useState("");
    const [forgotRole, setForgotRole] = useState("patient-login");
    const [forgotMessage, setForgotMessage] = useState("");
    const [forgotIsError, setForgotIsError] = useState(false);
    const [demoResetCode, setDemoResetCode] = useState("");

    const [loading, setLoading] = useState(false);
    const [authChecking, setAuthChecking] = useState(true);

    const goHome = () => setPage("home");

    const handleSendResetCode = async (e) => {
        e.preventDefault();
        const trimmedEmail = forgotEmail.trim();
        if (!trimmedEmail) {
            setForgotMessage("Please enter your registered email address.");
            setForgotIsError(true);
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            setForgotMessage("Please enter a valid email address.");
            setForgotIsError(true);
            return;
        }

        setLoading(true);
        setForgotMessage("");
        setDemoResetCode("");
        try {
            const data = await apiRequest("/auth/send-reset-code", {
                method: "POST",
                body: JSON.stringify({ email: trimmedEmail }),
            });
            setForgotStep(2);
            const code = data?.verificationCode || data?.resetCode;
            if (code) {
                setDemoResetCode(code);
                setForgotVerificationCode(code);
            }
            setForgotMessage(
                data?.message || "Verification code sent to your email! Enter the 6-digit code below to reset your password."
            );
            setForgotIsError(false);
        } catch (error) {
            console.error("Send reset code error:", error);
            setForgotMessage(error.message || "Unable to send verification code.");
            setForgotIsError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        const trimmedEmail = forgotEmail.trim();
        const trimmedCode = forgotVerificationCode.trim();

        if (!trimmedEmail || !trimmedCode || !forgotNewPassword) {
            setForgotMessage("Please fill in all required fields (Email, Verification Code, and New Password).");
            setForgotIsError(true);
            return;
        }

        setLoading(true);
        setForgotMessage("");
        try {
            await apiRequest("/auth/reset-password", {
                method: "POST",
                body: JSON.stringify({
                    email: trimmedEmail,
                    verificationCode: trimmedCode,
                    newPassword: forgotNewPassword,
                }),
            });
            setForgotMessage("Password reset successfully! You can now log in with your new password.");
            setForgotIsError(false);
            if (forgotRole === "patient-login") {
                setLoginEmail(trimmedEmail);
            } else if (forgotRole === "doctor-login") {
                setDoctorEmail(trimmedEmail);
            } else if (forgotRole === "admin-login") {
                setAdminEmail(trimmedEmail);
            }
            setForgotVerificationCode("");
            setForgotNewPassword("");
            setDemoResetCode("");
            setForgotStep(1);
        } catch (error) {
            console.error("Reset password error:", error);
            setForgotMessage(error.message || "Unable to reset password.");
            setForgotIsError(true);
        } finally {
            setLoading(false);
        }
    };

    const routeUserByRole = async (session) => {
        if (!session || !session.role) {
            throw new Error("Unable to determine user role.");
        }

        const role = String(session.role).toUpperCase();

        if (role === "DOCTOR") {
            let docProfile = session.doctor;
            if (!docProfile || !docProfile.id) {
                try {
                    docProfile = await apiRequest("/doctors/me");
                } catch {
                    docProfile = {
                        id: session.id || 1,
                        name: session.name || "Doctor",
                        email: session.email,
                        specialization: "General Practice",
                        consultationFee: 500
                    };
                }
            }
            setLoggedInDoctor(docProfile);
            setLoggedInPatient(null);
            setLoggedInAdmin(null);
            setPatientLoginPassword("");
            setDoctorPassword("");
            setAdminPassword("");
            setPage("doctor-dashboard");
            return "DOCTOR";
        } else if (role === "PATIENT") {
            let patProfile = session.patient;
            if (!patProfile || !patProfile.id) {
                try {
                    patProfile = await apiRequest("/patients/me");
                } catch {
                    patProfile = {
                        id: session.id || 1,
                        name: session.name || "Patient",
                        email: session.email
                    };
                }
            }
            setLoggedInPatient(patProfile);
            setLoggedInDoctor(null);
            setLoggedInAdmin(null);
            setPatientLoginPassword("");
            setDoctorPassword("");
            setAdminPassword("");
            setPage("patient-dashboard");
            return "PATIENT";
        } else if (role === "ADMIN") {
            const adminObj = {
                id: session.id,
                email: session.email,
                name: session.name || "Administrator",
                role: "ADMIN"
            };
            setLoggedInAdmin(adminObj);
            setLoggedInPatient(null);
            setLoggedInDoctor(null);
            setPatientLoginPassword("");
            setDoctorPassword("");
            setAdminPassword("");
            setPage("admin-dashboard");
            return "ADMIN";
        } else {
            throw new Error(`Unrecognized role: ${session.role}`);
        }
    };

    useEffect(() => {
        const restoreSession = async () => {
            try {
                const response = await apiFetch("/auth/me");
                if (!response.ok) {
                    return;
                }

                const session = await response.json();
                await routeUserByRole(session);
            } catch (error) {
                console.error("Unable to restore the signed-in session:", error);
                try {
                    await apiFetch("/auth/logout", { method: "POST" });
                } catch {
                    // Ignore logout error on session recovery failure
                }
                resetCsrfToken();
            } finally {
                setAuthChecking(false);
            }
        };

        restoreSession();
    }, []);

    // ==========================================
    // PATIENT REGISTRATION
    // ==========================================
    const handlePatientRegistration = async (e) => {
        e.preventDefault();

        if (
            !patientName.trim() ||
            !patientEmail.trim() ||
            !patientPhone.trim() ||
            !patientDateOfBirth ||
            !patientGender ||
            !patientPassword
        ) {
            alert("Please fill in all required fields.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(patientEmail.trim())) {
            alert("Please enter a valid email address.");
            return;
        }

        const cleanedPhone = patientPhone.replace(/\D/g, "");
        if (cleanedPhone.length !== 10) {
            alert("Phone number must be exactly 10 digits.");
            return;
        }

        setLoading(true);

        try {
            await apiRequest("/patients", {
                method: "POST",
                body: JSON.stringify({
                    name: patientName.trim(),
                    email: patientEmail.trim(),
                    phone: cleanedPhone,
                    dateOfBirth: patientDateOfBirth,
                    gender: patientGender,
                    password: patientPassword,
                }),
            });

            const registeredEmail = patientEmail.trim();

            setPatientName("");
            setPatientEmail("");
            setPatientPhone("");
            setPatientDateOfBirth("");
            setPatientGender("");
            setPatientPassword("");

            setLoginEmail(registeredEmail);
            setPage("patient-login");

            alert("Patient registered successfully!");
        } catch (error) {
            console.error("Patient registration error:", error);
            alert(error.message || "Unable to register patient.");
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // PATIENT LOGIN
    // ==========================================
    const handlePatientLogin = async (e) => {
        e.preventDefault();

        if (!loginEmail.trim()) {
            alert("Please enter your email.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(loginEmail.trim())) {
            alert("Please enter a valid email address.");
            return;
        }

        if (!patientLoginPassword) {
            alert("Please enter your password.");
            return;
        }

        setLoading(true);

        try {
            const session = await apiRequest("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email: loginEmail.trim(),
                    password: patientLoginPassword,
                }),
            });
            if (session.role && session.role !== "PATIENT") {
                alert(`Notice: Account recognized as ${session.role}. Redirecting to your ${session.role === "DOCTOR" ? "Doctor" : "Admin"} Dashboard.`);
            }
            await routeUserByRole(session);
        } catch (error) {
            console.error("Patient login error:", error);
            alert(error.message || "Unable to sign in.");
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // DOCTOR LOGIN
    // ==========================================
    const handleDoctorLogin = async (e) => {
        e.preventDefault();

        if (!doctorEmail.trim()) {
            alert("Please enter your email.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(doctorEmail.trim())) {
            alert("Please enter a valid email address.");
            return;
        }

        if (!doctorPassword) {
            alert("Please enter your password.");
            return;
        }

        setLoading(true);

        try {
            const session = await apiRequest("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email: doctorEmail.trim(),
                    password: doctorPassword,
                }),
            });
            if (session.role && session.role !== "DOCTOR") {
                alert(`Notice: Account recognized as ${session.role}. Redirecting to your ${session.role === "PATIENT" ? "Patient" : "Admin"} Dashboard.`);
            }
            await routeUserByRole(session);
        } catch (error) {
            console.error("Doctor login error:", error);
            alert(error.message || "Unable to sign in.");
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // ADMIN DEMO LOGIN
    // ==========================================
    const handleAdminLogin = async (e) => {
        e.preventDefault();

        if (!adminEmail.trim()) {
            alert("Please enter your email.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(adminEmail.trim())) {
            alert("Please enter a valid email address.");
            return;
        }

        if (!adminPassword) {
            alert("Please enter your password.");
            return;
        }

        setLoading(true);
        try {
            const session = await apiRequest("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email: adminEmail.trim(),
                    password: adminPassword,
                }),
            });
            if (session.role && session.role !== "ADMIN") {
                alert(`Notice: Account recognized as ${session.role}. Redirecting to your ${session.role === "DOCTOR" ? "Doctor" : "Patient"} Dashboard.`);
            }
            await routeUserByRole(session);
        } catch (error) {
            console.error("Administrator login error:", error);
            alert(error.message || "Unable to sign in.");
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // ADMIN REGISTRATION
    // ==========================================
    const handleAdminRegistration = async (e) => {
        e.preventDefault();

        if (!adminRegName.trim() || !adminRegEmail.trim() || !adminRegPassword) {
            alert("Please fill in all required fields.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(adminRegEmail.trim())) {
            alert("Please enter a valid email address.");
            return;
        }

        setLoading(true);

        try {
            await apiRequest("/auth/register-admin", {
                method: "POST",
                body: JSON.stringify({
                    name: adminRegName.trim(),
                    email: adminRegEmail.trim(),
                    password: adminRegPassword,
                }),
            });

            const registeredEmail = adminRegEmail.trim();

            setAdminRegName("");
            setAdminRegEmail("");
            setAdminRegPassword("");

            setAdminEmail(registeredEmail);
            setPage("admin-login");

            alert("Admin account registered successfully! You can now log in.");
        } catch (error) {
            console.error("Admin registration error:", error);
            alert(error.message || "Unable to register admin account.");
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // LOGOUT
    // ==========================================
    const handleLogout = async () => {
        setLoading(true);
        try {
            await apiFetch("/auth/logout", { method: "POST" });
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            resetCsrfToken();
            setLoggedInPatient(null);
            setLoggedInDoctor(null);
            setLoggedInAdmin(null);
            setPatientLoginPassword("");
            setDoctorPassword("");
            setAdminPassword("");
            setPage("home");
            setLoading(false);
        }
    };

    // ==========================================
    // DASHBOARD ROUTING
    // ==========================================
    if (authChecking) {
        return (
            <div className="app">
                <main className="login-page">
                    <p>Checking your session...</p>
                </main>
            </div>
        );
    }

    // ==========================================
    // ROLE GUARDS & DASHBOARD ROUTING
    // ==========================================
    if (loggedInDoctor) {
        return (
            <>
                <DoctorDashboard
                    doctor={loggedInDoctor}
                    onLogout={handleLogout}
                />
                <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </>
        );
    }

    if (loggedInPatient) {
        return (
            <>
                <PatientDashboard
                    patient={loggedInPatient}
                    onProfileUpdated={setLoggedInPatient}
                    onLogout={handleLogout}
                />
                <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </>
        );
    }

    if (loggedInAdmin) {
        return (
            <>
                <AdminDashboard onLogout={handleLogout} />
                <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </>
        );
    }

    // ==========================================
    // HOME PAGE
    // ==========================================
    if (page === "home") {
        return (
            <div className="app">
                <nav className="navbar">
                    <div className="logo">
                        Doctor Appointment
                    </div>

                    <div className="nav-buttons">
                        <button
                            type="button"
                            className="nav-patient"
                            onClick={() => setPage("patient-login")}
                        >
                            Patient
                        </button>

                        <button
                            type="button"
                            className="nav-doctor"
                            onClick={() => setPage("doctor-login")}
                        >
                            Doctor
                        </button>

                        <button
                            type="button"
                            className="nav-admin"
                            onClick={() => setPage("admin-login")}
                        >
                            Admin
                        </button>
                    </div>
                </nav>

                <section className="hero">
                    <div className="hero-content">
                        <h1 className="home-title">
                            Online Doctor Appointment System
                        </h1>

                        <p className="home-subtitle">
                            Book appointments with doctors quickly and easily.
                        </p>

                        <div className="login-buttons">
                            <button
                                type="button"
                                className="patient-btn"
                                onClick={() => setPage("patient-login")}
                            >
                                Patient Login
                            </button>

                            <button
                                type="button"
                                className="doctor-btn"
                                onClick={() => setPage("doctor-login")}
                            >
                                Doctor Login
                            </button>

                            <button
                                type="button"
                                className="admin-btn"
                                onClick={() => setPage("admin-login")}
                            >
                                Admin Login
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    // ==========================================
    // PATIENT LOGIN PAGE
    // ==========================================
    if (page === "patient-login") {
        return (
            <div className="app">
                <nav className="navbar">
                    <div className="logo">
                        Doctor Appointment
                    </div>

                    <button
                        type="button"
                        className="back-nav-btn"
                        onClick={goHome}
                    >
                        Home
                    </button>
                </nav>

                <main className="login-page">
                    <div className="form-card">
                        <h1 className="form-title">Patient Login</h1>

                        <p className="form-subtitle">
                            Login to manage your appointments
                        </p>

                        <form onSubmit={handlePatientLogin}>
                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={loginEmail}
                                onChange={(e) =>
                                    setLoginEmail(e.target.value)
                                }
                                required
                            />

                            <PasswordInput
                                placeholder="Password"
                                value={patientLoginPassword}
                                onChange={(e) =>
                                    setPatientLoginPassword(e.target.value)
                                }
                                autoComplete="current-password"
                                required
                            />

                            <button
                                type="button"
                                className="forgot-password-link"
                                onClick={() => {
                                    setForgotEmail(loginEmail);
                                    setForgotRole("patient-login");
                                    setForgotMessage("");
                                    setPage("forgot-password");
                                }}
                            >
                                Forgot password?
                            </button>

                            <button
                                type="submit"
                                className="submit-btn"
                                disabled={loading}
                            >
                                {loading ? "Logging in..." : "Login"}
                            </button>
                        </form>

                        <p className="register-text">
                            Don't have an account?
                        </p>

                        <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => setPage("patient-register")}
                        >
                            Patient Registration
                        </button>

                        <div className="example-login" style={{ marginTop: "14px", textAlign: "center" }}>
                            <p style={{ margin: "0 0 6px 0", fontSize: "0.85rem", color: "var(--text-muted, #64748b)" }}>
                                <strong>Demo Patient Account:</strong>
                            </p>
                            <button
                                type="button"
                                className="secondary-btn"
                                style={{ padding: "6px 12px", fontSize: "0.8rem", width: "auto" }}
                                onClick={() => {
                                    setLoginEmail("patient7093@gmail.com");
                                    setPatientLoginPassword("PatientPassword123!");
                                }}
                            >
                                Fill Demo Patient (patient7093@gmail.com)
                            </button>
                        </div>

                        <button
                            type="button"
                            className="back-btn"
                            onClick={goHome}
                        >
                            Back
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // ==========================================
    // PATIENT REGISTRATION PAGE
    // ==========================================
    if (page === "patient-register") {
        return (
            <div className="app">
                <nav className="navbar">
                    <div className="logo">
                        Doctor Appointment
                    </div>

                    <button
                        type="button"
                        className="back-nav-btn"
                        onClick={goHome}
                    >
                        Home
                    </button>
                </nav>

                <main className="login-page">
                    <div className="form-card registration-card">
                        <h1 className="registration-title">
                            Patient Registration
                        </h1>

                        <p className="form-subtitle">
                            Create your patient account
                        </p>

                        <form onSubmit={handlePatientRegistration}>
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={patientName}
                                onChange={(e) =>
                                    setPatientName(e.target.value)
                                }
                                required
                            />

                            <input
                                type="email"
                                placeholder="Email"
                                value={patientEmail}
                                onChange={(e) =>
                                    setPatientEmail(e.target.value)
                                }
                                required
                            />

                            <input
                                type="tel"
                                placeholder="Phone Number (10 digits)"
                                maxLength="10"
                                pattern="[0-9]{10}"
                                title="Phone number must be exactly 10 digits"
                                value={patientPhone}
                                onChange={(e) =>
                                    setPatientPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                                }
                                required
                            />

                            <label
                                className="form-label"
                                htmlFor="dateOfBirth"
                            >
                                Date of Birth
                            </label>

                            <input
                                id="dateOfBirth"
                                type="date"
                                value={patientDateOfBirth}
                                onChange={(e) =>
                                    setPatientDateOfBirth(e.target.value)
                                }
                                required
                            />

                            <label className="form-label" htmlFor="gender">
                                Gender
                            </label>

                            <select
                                id="gender"
                                value={patientGender}
                                onChange={(e) =>
                                    setPatientGender(e.target.value)
                                }
                                required
                            >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>

                            <PasswordInput
                                placeholder="Password"
                                value={patientPassword}
                                onChange={(e) =>
                                    setPatientPassword(e.target.value)
                                }
                                autoComplete="new-password"
                                required
                            />

                            <button
                                type="submit"
                                className="submit-btn"
                                disabled={loading}
                            >
                                {loading ? "Registering..." : "Register"}
                            </button>
                        </form>

                        <button
                            type="button"
                            className="back-btn"
                            onClick={() => setPage("patient-login")}
                        >
                            Back to Patient Login
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // ==========================================
    // DOCTOR LOGIN PAGE
    // ==========================================
    if (page === "doctor-login") {
        return (
            <div className="app">
                <nav className="navbar">
                    <div className="logo">
                        Doctor Appointment
                    </div>

                    <button
                        type="button"
                        className="back-nav-btn"
                        onClick={goHome}
                    >
                        Home
                    </button>
                </nav>

                <main className="login-page">
                    <div className="form-card">
                        <h1 className="form-title">Doctor Login</h1>

                        <p className="form-subtitle">
                            Login to manage your appointments
                        </p>

                        <form onSubmit={handleDoctorLogin}>
                            <input
                                type="email"
                                placeholder="Enter doctor email"
                                value={doctorEmail}
                                onChange={(e) =>
                                    setDoctorEmail(e.target.value)
                                }
                                required
                            />

                            <PasswordInput
                                placeholder="Password"
                                value={doctorPassword}
                                onChange={(e) =>
                                    setDoctorPassword(e.target.value)
                                }
                                autoComplete="current-password"
                                required
                            />

                            <button
                                type="button"
                                className="forgot-password-link"
                                onClick={() => {
                                    setForgotEmail(doctorEmail);
                                    setForgotRole("doctor-login");
                                    setForgotMessage("");
                                    setPage("forgot-password");
                                }}
                            >
                                Forgot password?
                            </button>

                            <button
                                type="submit"
                                className="submit-btn"
                                disabled={loading}
                            >
                                {loading ? "Logging in..." : "Login"}
                            </button>
                        </form>

                        <div className="example-login" style={{ marginTop: "16px", textAlign: "center" }}>
                            <p style={{ margin: "0 0 6px 0", fontSize: "0.85rem", color: "var(--text-muted, #64748b)" }}>
                                <strong>Registered Doctor Accounts:</strong>
                            </p>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                                <button
                                    type="button"
                                    className="secondary-btn"
                                    style={{ padding: "6px 12px", fontSize: "0.8rem", width: "auto" }}
                                    onClick={() => {
                                        setDoctorEmail("dr.kapoor56912@gmail.com");
                                        setDoctorPassword("DocPassword123!");
                                    }}
                                >
                                    Dr. Anita Kapoor (Cardiology)
                                </button>
                                <button
                                    type="button"
                                    className="secondary-btn"
                                    style={{ padding: "6px 12px", fontSize: "0.8rem", width: "auto" }}
                                    onClick={() => {
                                        setDoctorEmail("satya358@gmail.com");
                                        setDoctorPassword("satya@358");
                                    }}
                                >
                                    Dr. Satya (Orthopedics)
                                </button>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="back-btn"
                            onClick={goHome}
                        >
                            Back
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // ==========================================
    // ADMIN LOGIN PAGE
    // ==========================================
    if (page === "admin-login") {
        return (
            <div className="app">
                <nav className="navbar">
                    <div className="logo">
                        Doctor Appointment
                    </div>

                    <button
                        type="button"
                        className="back-nav-btn"
                        onClick={goHome}
                    >
                        Home
                    </button>
                </nav>

                <main className="login-page">
                    <div className="form-card">
                        <h1 className="form-title">Admin Login</h1>

                        <p className="form-subtitle">
                            Administrator access
                        </p>

                        <form onSubmit={handleAdminLogin}>
                            <input
                                type="email"
                                placeholder="Admin Email"
                                value={adminEmail}
                                onChange={(e) =>
                                    setAdminEmail(e.target.value)
                                }
                                required
                            />

                            <PasswordInput
                                placeholder="Password"
                                value={adminPassword}
                                onChange={(e) =>
                                    setAdminPassword(e.target.value)
                                }
                                autoComplete="current-password"
                                required
                            />

                            <button
                                type="button"
                                className="forgot-password-link"
                                onClick={() => {
                                    setForgotEmail(adminEmail);
                                    setForgotRole("admin-login");
                                    setForgotMessage("");
                                    setPage("forgot-password");
                                }}
                            >
                                Forgot password?
                            </button>

                            <button
                                type="submit"
                                className="submit-btn"
                                disabled={loading}
                            >
                                {loading ? "Logging in..." : "Login"}
                            </button>
                        </form>

                        <p className="register-text" style={{ marginTop: "16px" }}>
                            Need an administrator account?
                        </p>

                        <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => setPage("admin-register")}
                        >
                            Admin Registration
                        </button>

                        <button
                            type="button"
                            className="back-btn"
                            onClick={goHome}
                        >
                            Back
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // ==========================================
    // ADMIN REGISTRATION PAGE
    // ==========================================
    if (page === "admin-register") {
        return (
            <div className="app">
                <nav className="navbar">
                    <div className="logo">
                        Doctor Appointment
                    </div>

                    <button
                        type="button"
                        className="back-nav-btn"
                        onClick={goHome}
                    >
                        Home
                    </button>
                </nav>

                <main className="login-page">
                    <div className="form-card registration-card">
                        <h1 className="registration-title">
                            Admin Registration
                        </h1>

                        <p className="form-subtitle">
                            Create a new administrator account
                        </p>

                        <form onSubmit={handleAdminRegistration}>
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={adminRegName}
                                onChange={(e) =>
                                    setAdminRegName(e.target.value)
                                }
                                required
                            />

                            <input
                                type="email"
                                placeholder="Admin Email"
                                value={adminRegEmail}
                                onChange={(e) =>
                                    setAdminRegEmail(e.target.value)
                                }
                                required
                            />

                            <PasswordInput
                                placeholder="Password (4+ characters)"
                                value={adminRegPassword}
                                onChange={(e) =>
                                    setAdminRegPassword(e.target.value)
                                }
                                autoComplete="new-password"
                                required
                            />

                            <button
                                type="submit"
                                className="submit-btn"
                                disabled={loading}
                            >
                                {loading ? "Registering..." : "Register Admin"}
                            </button>
                        </form>

                        <button
                            type="button"
                            className="back-btn"
                            onClick={() => setPage("admin-login")}
                        >
                            Back to Admin Login
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // ==========================================
    // FORGOT PASSWORD PAGE
    // ==========================================
    if (page === "forgot-password") {
        return (
            <div className="app">
                <nav className="navbar">
                    <div className="logo">
                        Doctor Appointment
                    </div>

                    <button
                        type="button"
                        className="back-nav-btn"
                        onClick={() => {
                            setForgotStep(1);
                            setForgotMessage("");
                            setDemoResetCode("");
                            setPage(forgotRole);
                        }}
                    >
                        Back to Login
                    </button>
                </nav>

                <main className="login-page">
                    <div className="form-card">
                        <h1 className="form-title">
                            {forgotStep === 1 ? "Forgot Password" : "Verify & Reset Password"}
                        </h1>

                        <p className="form-subtitle">
                            {forgotStep === 1
                                ? "Enter your registered @gmail.com email address to receive a verification code"
                                : "Enter the 6-digit code sent to your email along with your new password"}
                        </p>

                        {demoResetCode && (
                            <div
                                style={{
                                    background: "#e0f2fe",
                                    border: "1px solid #0284c7",
                                    padding: "12px",
                                    borderRadius: "9px",
                                    color: "#0369a1",
                                    marginBottom: "16px",
                                    textAlign: "center",
                                    fontWeight: "600",
                                }}
                            >
                                🔑 Demo Verification Code:{" "}
                                <span style={{ fontSize: "18px", letterSpacing: "2px", color: "#0c4a6e" }}>
                                    {demoResetCode}
                                </span>
                            </div>
                        )}

                        {forgotMessage && (
                            <p
                                className={forgotIsError ? "form-error" : "form-success"}
                                role={forgotIsError ? "alert" : "status"}
                                style={{ marginBottom: "15px", textAlign: "center" }}
                            >
                                {forgotMessage}
                            </p>
                        )}

                        {forgotStep === 1 ? (
                            <form onSubmit={handleSendResetCode}>
                                <label className="form-label" htmlFor="forgotEmailInput">
                                    Registered @gmail.com Email
                                </label>
                                <input
                                    id="forgotEmailInput"
                                    type="email"
                                    placeholder="e.g. user@gmail.com"
                                    pattern="[a-zA-Z0-9._%+-]+@gmail\.com$"
                                    title="Must be a valid @gmail.com address"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    required
                                />

                                <button
                                    type="submit"
                                    className="submit-btn"
                                    disabled={loading}
                                >
                                    {loading ? "Sending Code..." : "Send Verification Code"}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleResetPassword}>
                                <label className="form-label" htmlFor="forgotEmailReadonly">
                                    Email
                                </label>
                                <input
                                    id="forgotEmailReadonly"
                                    type="email"
                                    value={forgotEmail}
                                    readOnly
                                    style={{ background: "#f1f5f9", cursor: "not-allowed" }}
                                />

                                <label className="form-label" htmlFor="forgotCodeInput">
                                    6-Digit Verification Code
                                </label>
                                <input
                                    id="forgotCodeInput"
                                    type="text"
                                    placeholder="Enter 6-digit code"
                                    maxLength="6"
                                    value={forgotVerificationCode}
                                    onChange={(e) => setForgotVerificationCode(e.target.value)}
                                    required
                                />

                                <label className="form-label">
                                    New Password
                                </label>
                                <PasswordInput
                                    placeholder="Enter new password (min. 6 chars)"
                                    value={forgotNewPassword}
                                    onChange={(e) => setForgotNewPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                />

                                <button
                                    type="submit"
                                    className="submit-btn"
                                    disabled={loading}
                                >
                                    {loading ? "Resetting Password..." : "Reset Password"}
                                </button>

                                <button
                                    type="button"
                                    className="forgot-password-link"
                                    style={{ marginTop: "10px", width: "100%", textAlign: "center" }}
                                    onClick={() => {
                                        setForgotStep(1);
                                        setForgotMessage("");
                                    }}
                                >
                                    Didn't get a code? Resend code
                                </button>
                            </form>
                        )}

                        <button
                            type="button"
                            className="back-btn"
                            onClick={() => {
                                setForgotStep(1);
                                setForgotMessage("");
                                setDemoResetCode("");
                                setPage(forgotRole);
                            }}
                        >
                            Back to Login
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // ==========================================
    // FALLBACK PAGE
    // ==========================================
    return (
        <div className="app">
            <main className="login-page">
                <div className="form-card">
                    <h1 className="form-title">
                        Online Doctor Appointment System
                    </h1>

                    <button
                        type="button"
                        className="submit-btn"
                        onClick={goHome}
                    >
                        Go Home
                    </button>
                </div>
            </main>
        </div>
    );
}

export default App;