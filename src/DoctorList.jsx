import { useEffect, useState } from "react";
import { apiRequest } from "./api";

function DoctorList() {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        apiRequest("/doctors")
            .then((data) => {
                setDoctors(data);
            })
            .catch((error) => {
                console.error("Error loading doctors:", error);
                setError(error.message || "Unable to load doctors.");
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <p>Loading doctors...</p>;
    }

    return (
        <div>
            <h2>Available Doctors</h2>
            {error && <p role="alert">{error}</p>}

            {doctors.length === 0 ? (
                <p>No doctors available yet.</p>
            ) : (
                doctors.map((doctor) => (
                    <div key={doctor.id}>
                        <h3>{doctor.name}</h3>
                        <p>Specialization: {doctor.specialization}</p>
                        <p>Qualification: {doctor.qualification}</p>
                        <p>Experience: {doctor.experience} years</p>
                    </div>
                ))
            )}
        </div>
    );
}

export default DoctorList;