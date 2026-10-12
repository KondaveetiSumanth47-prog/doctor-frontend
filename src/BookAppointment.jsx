import { useState } from "react";
import { apiRequest } from "./api";
import { formatTime12Hour } from "./utils";
import "./App.css";

function BookAppointment({ patient, doctor, onBack, onBooked }) {
    const [appointmentDate, setAppointmentDate] = useState("");
    const [appointmentTime, setAppointmentTime] = useState("");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleBooking = async (e) => {
        e.preventDefault();

        if (!appointmentDate || !appointmentTime) {
            setErrorMessage("Please select an appointment date and time.");
            return;
        }

        setLoading(true);
        setErrorMessage("");

        try {
            const appointment = await apiRequest(
                "/appointments",
                {
                    method: "POST",
                    body: JSON.stringify({
                        doctorId: doctor.id,
                        appointmentDate,
                        appointmentTime,
                        reason: reason.trim(),
                    }),
                }
            );

            if (onBooked) {
                onBooked(appointment);
            }
        } catch (error) {
            console.error("Booking error:", error);
            setErrorMessage(error.message || "Unable to book appointment.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="booking-page">

            {/* =========================
                NAVBAR
            ========================= */}
            <nav className="booking-navbar">

                <div className="booking-logo">
                    Doctor Appointment
                </div>

                <button
                    type="button"
                    className="booking-back-nav-btn"
                    onClick={onBack}
                >
                    Back
                </button>

            </nav>

            {/* =========================
                BOOKING CONTENT
            ========================= */}
            <main className="booking-content">

                <div className="booking-card">

                    {/* =========================
                        HEADING
                    ========================= */}
                    <div className="booking-header">

                        <h1>
                            Book Appointment
                        </h1>

                        <p>
                            Schedule an appointment with your doctor
                        </p>

                    </div>

                    {/* =========================
                        DOCTOR INFORMATION
                    ========================= */}
                    <div className="booking-doctor-card">

                        <div className="booking-doctor-icon">
                            👨‍⚕️
                        </div>

                        <div className="booking-doctor-info">

                            <h2>
                                Dr. {doctor.name.replace(/^Dr\.?\s*/i, "")}
                            </h2>

                            <p>
                                <strong>
                                    Specialization:
                                </strong>{" "}
                                {doctor.specialization}
                            </p>

                            <p>
                                <strong>
                                    Qualification:
                                </strong>{" "}
                                {doctor.qualification}
                            </p>

                            <p>
                                <strong>
                                    Experience:
                                </strong>{" "}
                                {doctor.experience} years
                            </p>

                        </div>

                    </div>

                    {/* =========================
                        PATIENT INFORMATION
                    ========================= */}
                    <div className="booking-patient-card">

                        <h3>
                            Patient Information
                        </h3>

                        <div className="booking-patient-details">

                            <p>
                                <strong>
                                    Name:
                                </strong>{" "}
                                {patient.name}
                            </p>

                            <p>
                                <strong>
                                    Email:
                                </strong>{" "}
                                {patient.email}
                            </p>

                            <p>
                                <strong>
                                    Phone:
                                </strong>{" "}
                                {patient.phone}
                            </p>

                        </div>

                    </div>

                    {/* =========================
                        APPOINTMENT FORM
                    ========================= */}
                    <form
                        className="booking-form"
                        onSubmit={handleBooking}
                    >

                        {/* DATE */}
                        <div className="booking-form-group">

                            <label htmlFor="appointmentDate">
                                Appointment Date
                            </label>

                            <input
                                id="appointmentDate"
                                type="date"
                                value={appointmentDate}
                                min={(() => {
                                    const today = new Date();
                                    today.setMinutes(
                                        today.getMinutes() - today.getTimezoneOffset()
                                    );
                                    return today.toISOString().split("T")[0];
                                })()}
                                onChange={(e) =>
                                    setAppointmentDate(
                                        e.target.value
                                    )
                                }
                                required
                            />

                        </div>

                        {/* TIME */}
                        <div className="booking-form-group">

                            <label htmlFor="appointmentTime">
                                Appointment Time: <strong>{appointmentTime ? formatTime12Hour(appointmentTime) : "Select a 12-hour slot below"}</strong>
                            </label>

                            <input
                                id="appointmentTime"
                                type="time"
                                value={appointmentTime}
                                onChange={(e) =>
                                    setAppointmentTime(
                                        e.target.value
                                    )
                                }
                                required
                            />

                            <div style={{ marginTop: '10px' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#4a5568', display: 'block', marginBottom: '6px' }}>
                                    Quick Select Available 12-Hour Slot (AM / PM):
                                </span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {[
                                        "09:00", "09:30", "10:00", "10:30",
                                        "11:00", "11:30", "14:00", "14:30",
                                        "15:00", "15:30", "16:00", "16:30",
                                        "17:00"
                                    ].map((slot) => {
                                        const formatted = formatTime12Hour(slot);
                                        const isSelected = appointmentTime === slot || appointmentTime === `${slot}:00`;
                                        return (
                                            <button
                                                key={slot}
                                                type="button"
                                                onClick={() => setAppointmentTime(slot)}
                                                style={{
                                                    padding: '5px 10px',
                                                    borderRadius: '6px',
                                                    border: isSelected ? '2px solid #2b6cb0' : '1px solid #cbd5e0',
                                                    backgroundColor: isSelected ? '#ebf8ff' : '#ffffff',
                                                    color: isSelected ? '#2b6cb0' : '#4a5568',
                                                    fontWeight: isSelected ? 'bold' : '500',
                                                    fontSize: '0.82rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                {formatted}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>

                        {/* REASON */}
                        <div className="booking-form-group">

                            <label htmlFor="reason">
                                Reason for Visit
                            </label>

                            <textarea
                                id="reason"
                                value={reason}
                                onChange={(e) =>
                                    setReason(e.target.value)
                                }
                                placeholder="Enter reason for your visit"
                                rows="5"
                            />

                        </div>

                        {/* BUTTONS */}
                        <div className="booking-buttons">

                            <button
                                type="submit"
                                className="confirm-booking-btn"
                                disabled={loading}
                            >
                                {loading
                                    ? "Booking..."
                                    : "Book Appointment"}
                            </button>

                            <button
                                type="button"
                                className="cancel-booking-btn"
                                onClick={onBack}
                                disabled={loading}
                            >
                                Cancel
                            </button>

                        </div>

                    </form>

                    {errorMessage && (
                        <p className="form-error" role="alert">
                            {errorMessage}
                        </p>
                    )}

                </div>

            </main>

        </div>
    );
}

export default BookAppointment;