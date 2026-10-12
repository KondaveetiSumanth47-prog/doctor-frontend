import { useState } from "react";
import { apiRequest } from "./api";
import PasswordInput from "./PasswordInput";

function PatientRegister({ onBack }) {
    const [patient, setPatient] = useState({
        name: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        gender: "",
        password: "",
    });
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (event) => {
        setPatient({
            ...patient,
            [event.target.name]: event.target.value,
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(patient.email.trim())) {
            setMessage("Please enter a valid email address.");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            await apiRequest("/patients", {
                method: "POST",
                body: JSON.stringify({
                    ...patient,
                    email: patient.email.trim(),
                }),
            });
            setMessage("Patient registered successfully. You can now sign in.");
            setPatient({
                name: "",
                email: "",
                phone: "",
                dateOfBirth: "",
                gender: "",
                password: "",
            });
        } catch (error) {
            console.error("Patient registration error:", error);
            setMessage(error.message || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="form-card registration-card">
                <h1 className="registration-title">Patient Registration</h1>

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        name="name"
                        placeholder="Full Name"
                        value={patient.name}
                        onChange={handleChange}
                        maxLength="120"
                        required
                    />
                    <input
                        type="email"
                        name="email"
                        placeholder="Email address"
                        value={patient.email}
                        onChange={handleChange}
                        maxLength="254"
                        required
                    />
                    <input
                        type="tel"
                        name="phone"
                        placeholder="Phone Number (10 digits)"
                        maxLength="10"
                        pattern="[0-9]{10}"
                        title="Phone number must be exactly 10 digits"
                        value={patient.phone}
                        onChange={(e) => setPatient({ ...patient, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                        required
                    />
                    <label className="form-label" htmlFor="registration-date-of-birth">
                        Date of Birth
                    </label>
                    <input
                        id="registration-date-of-birth"
                        type="date"
                        name="dateOfBirth"
                        value={patient.dateOfBirth}
                        onChange={handleChange}
                        max={new Date().toISOString().split("T")[0]}
                        required
                    />
                    <label className="form-label" htmlFor="registration-gender">
                        Gender
                    </label>
                    <select
                        id="registration-gender"
                        name="gender"
                        value={patient.gender}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                    <PasswordInput
                        placeholder="Password (4+ characters)"
                        value={patient.password}
                        onChange={(e) => setPatient({ ...patient, password: e.target.value })}
                        autoComplete="new-password"
                        required
                    />
                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? "Registering..." : "Register"}
                    </button>
                    {onBack && (
                        <button type="button" className="back-btn" onClick={onBack}>
                            Back
                        </button>
                    )}
                </form>

                {message && <p role="status" style={{ marginTop: "12px", textAlign: "center", color: message.includes("successfully") ? "#059669" : "#dc2626" }}>{message}</p>}
            </div>
        </div>
    );
}

export default PatientRegister;
