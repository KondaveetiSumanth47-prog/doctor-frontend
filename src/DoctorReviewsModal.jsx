import { useState, useEffect } from 'react';
import { apiRequest } from './api';

export default function DoctorReviewsModal({ doctor, onClose }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (doctor?.id) {
      apiRequest(`/reviews/doctor/${doctor.id}`)
        .then((data) => setReviews(Array.isArray(data) ? data : []))
        .catch((err) => console.error("Failed to load doctor reviews:", err))
        .finally(() => setLoading(false));
    }
  }, [doctor]);

  const renderStars = (rating) => {
    return '★'.repeat(rating || 5) + '☆'.repeat(Math.max(0, 5 - (rating || 5)));
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.55)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1200
    }}>
      <div className="modal-content" style={{
        backgroundColor: '#fff', borderRadius: '14px', padding: '24px',
        maxWidth: '520px', width: '92%', maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)', color: '#2d3748'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#2b6cb0', fontSize: '1.25rem' }}>
              ⭐ Patient Reviews for {doctor.name}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#718096' }}>
              {doctor.specialization} · Overall Rating: <strong>{doctor.rating ? doctor.rating.toFixed(1) : '5.0'} / 5.0</strong> ({reviews.length} reviews)
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#718096' }}>✕</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#718096' }}>Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', backgroundColor: '#f7fafc', borderRadius: '8px', color: '#718096' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🩺</div>
            <p style={{ margin: 0, fontWeight: '500' }}>No reviews yet for Dr. {doctor.name.replace(/^Dr\.?\s*/i, "")}.</p>
            <small>Patients will be able to leave verified reviews after their consultation.</small>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reviews.map((rev) => (
              <div key={rev.id} style={{
                backgroundColor: '#f7fafc', padding: '14px 16px', borderRadius: '10px',
                border: '1px solid #edf2f7'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#2b6cb0' }}>
                    {rev.patient ? rev.patient.name : 'Verified Patient'}
                  </span>
                  <span style={{ color: '#d69e2e', fontSize: '1rem', letterSpacing: '2px' }}>
                    {renderStars(rev.rating)}
                  </span>
                </div>
                <p style={{ margin: '0 0 6px 0', fontSize: '0.88rem', color: '#4a5568', lineHeight: '1.5' }}>
                  "{rev.reviewText || "Great consultation and thorough medical examination."}"
                </p>
                <div style={{ fontSize: '0.72rem', color: '#a0aec0', textAlign: 'right' }}>
                  📅 {new Date(rev.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #cbd5e0', background: '#fff', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
