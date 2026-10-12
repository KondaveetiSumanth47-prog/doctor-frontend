(() => {
  // src/App.jsx
  ```jsx
import { useState } from "react";
import "./App.css";

import PatientDashboard from "./PatientDashboard";
import DoctorDashboard from "./DoctorDashboard";
import AdminDashboard from "./AdminDashboard";

function App() {
    const [page, setPage] = useState("home");

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
    const [doctorEmail, setDoctorEmail] = useState("");

    const [adminEmail, setAdminEmail] = useState("");
    const [adminPassword, setAdminPassword] = useState("");

    const [loading, setLoading] = useState(false);

    const goHome = () => setPage("home");

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

        setLoading(true);

        try {
            const response = await fetch(
                "http://localhost:8080/api/patients",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: patientName.trim(),
                        email: patientEmail.trim(),
                        phone: patientPhone.trim(),
                        dateOfBirth: patientDateOfBirth,
                        gender: patientGender,
                        password: patientPassword,
                    }),
                }
            );

            if (!response.ok) {
                const message = await response.text();
                throw new Error(
                    message || "Patient registration failed."
                );
            }

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

        setLoading(true);

        try {
            const response = await fetch(
                "http://localhost:8080/api/patients/email/" +
                    encodeURIComponent(loginEmail.trim())
            );

            if (!response.ok) {
                alert("Patient not found. Please check your email.");
                return;
            }

            const patient = await response.json();

            setLoggedInPatient(patient);
            setPage("patient-dashboard");
        } catch (error) {
            console.error("Patient login error:", error);
            alert(
                "Unable to connect to the server. Make sure the backend is running."
            );
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

        setLoading(true);

        try {
            const response = await fetch(
                "http://localhost:8080/api/doctors/email/" +
                    encodeURIComponent(doctorEmail.trim())
            );

            if (!response.ok) {
                alert("Doctor not found. Please check your email.");
                return;
            }

            const doctor = await response.json();

            setLoggedInDoctor(doctor);
            setPage("doctor-dashboard");
        } catch (error) {
            console.error("Doctor login error:", error);
            alert(
                "Unable to connect to the server. Make sure the backend is running."
            );
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // ADMIN DEMO LOGIN
    // ==========================================
    const handleAdminLogin = (e) => {
        e.preventDefault();

        if (
            adminEmail.trim().toLowerCase() === "admin@gmail.com" &&
            adminPassword === "Admin@123"
        ) {
            setLoggedInAdmin({ email: adminEmail.trim() });
            setAdminEmail("");
            setAdminPassword("");
            setPage("admin-dashboard");
        } else {
            alert("Invalid admin email or password.");
        }
    };

    // ==========================================
    // LOGOUT
    // ==========================================
    const handlePatientLogout = () => {
        setLoggedInPatient(null);
        setPage("home");
    };

    const handleDoctorLogout = () => {
        setLoggedInDoctor(null);
        setPage("home");
    };

    const handleAdminLogout = () => {
        setLoggedInAdmin(null);
        setPage("home");
    };

    // ==========================================
    // DASHBOARD ROUTING
    // ==========================================
    if (page === "patient-dashboard" && loggedInPatient) {
        return (
            <PatientDashboard
                patient={loggedInPatient}
                onLogout={handlePatientLogout}
            />
        );
    }

    if (page === "doctor-dashboard" && loggedInDoctor) {
        return (
            <DoctorDashboard
                doctor={loggedInDoctor}
                onLogout={handleDoctorLogout}
            />
        );
    }

    if (page === "admin-dashboard" && loggedInAdmin) {
        return <AdminDashboard onLogout={handleAdminLogout} />;
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
                                placeholder="Phone"
                                value={patientPhone}
                                onChange={(e) =>
                                    setPatientPhone(e.target.value)
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

                            <input
                                type="password"
                                placeholder="Password"
                                value={patientPassword}
                                onChange={(e) =>
                                    setPatientPassword(e.target.value)
                                }
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

                            <button
                                type="submit"
                                className="submit-btn"
                                disabled={loading}
                            >
                                {loading ? "Logging in..." : "Login"}
                            </button>
                        </form>

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

                            <input
                                type="password"
                                placeholder="Password"
                                value={adminPassword}
                                onChange={(e) =>
                                    setAdminPassword(e.target.value)
                                }
                                required
                            />

                            <button
                                type="submit"
                                className="submit-btn"
                            >
                                Login
                            </button>
                        </form>

                        <p className="form-subtitle">
                            Demo: admin@gmail.com / Admin@123
                        </p>

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
```;
})();
