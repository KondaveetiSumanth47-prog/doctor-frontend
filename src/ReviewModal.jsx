import { useState } from 'react';
import { apiRequest } from './api';

export function ReviewModal({ appointment, onClose, onSuccess }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('Please select a star rating between 1 and 5.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await apiRequest('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          appointmentId: appointment.id,
          rating,
          reviewText: reviewText.trim(),
        }),
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const doctorName = appointment?.doctor?.name ? `Dr. ${appointment.doctor.name}` : 'Doctor';

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1150,
      }}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '28px',
          maxWidth: '460px',
          width: '90%',
          boxShadow: '0 15px 35px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#2b6cb0', fontSize: '1.25rem' }}>⭐ Rate & Review {doctorName}</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#718096' }}
          >
            ✕
          </button>
        </div>

        <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#4a5568' }}>
          Share your experience for your appointment on <strong>{appointment?.appointmentDate}</strong>.
        </p>

        {error && (
          <div style={{ padding: '10px 14px', backgroundColor: '#fed7d7', color: '#9b2c2c', borderRadius: '6px', marginBottom: '14px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px', textAlign: 'center' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#2d3748', fontSize: '0.95rem' }}>
              Your Rating: {rating} / 5
            </label>
            <div style={{ display: 'inline-flex', gap: '6px', cursor: 'pointer', fontSize: '2rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  style={{
                    color: star <= (hoverRating || rating) ? '#ecc94b' : '#e2e8f0',
                    transition: 'color 0.15s ease',
                  }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.85rem', color: '#4a5568' }}>
              Review Comments (Optional)
            </label>
            <textarea
              rows="3"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Tell others about the doctor's professionalism, care, and clarity..."
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e0',
                fontSize: '0.9rem',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #cbd5e0',
                background: '#fff',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                border: 'none',
                background: '#3182ce',
                color: '#fff',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReviewModal;
