import { useState } from 'react';
import { apiRequest } from './api';
import './App.css';

export default function PaymentModal({ appointment, onClose, onSuccess }) {
  const [method, setMethod] = useState('UPI'); // 'UPI', 'DEBIT_CARD', 'CASH'
  const [upiId, setUpiId] = useState('');
  const [upiApp, setUpiApp] = useState('Google Pay');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const doctorName = appointment?.doctor?.name || 'Doctor';
  const fee = appointment?.doctor?.consultationFee || 500;

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : v;
  };

  const handlePay = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (method === 'UPI') {
      if (!upiId.trim() && !upiApp) {
        setError('Please enter your UPI ID or select a UPI payment app.');
        return;
      }
      if (upiId.trim() && !upiId.includes('@')) {
        setError('Please enter a valid UPI ID (e.g., yourname@okhdfcbank).');
        return;
      }
    } else if (method === 'DEBIT_CARD') {
      if (cardNumber.replace(/\s/g, '').length < 12) {
        setError('Please enter a valid 16-digit card number.');
        return;
      }
      if (!cardExpiry.trim()) {
        setError('Please enter card expiry date (MM/YY).');
        return;
      }
      if (cardCvv.trim().length < 3) {
        setError('Please enter 3-digit CVV.');
        return;
      }
    }

    setProcessing(true);
    try {
      const updated = await apiRequest(`/appointments/${appointment.id}/pay?paymentMethod=${encodeURIComponent(method)}`, {
        method: 'POST'
      });
      if (onSuccess) {
        onSuccess(updated, method);
      }
      onClose();
    } catch (err) {
      console.error('Payment failed:', err);
      setError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1200
    }}>
      <div className="modal-content" style={{
        backgroundColor: '#ffffff', borderRadius: '14px', padding: '26px',
        maxWidth: '480px', width: '92%', boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        color: '#2d3748', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#2b6cb0', fontSize: '1.25rem' }}>💳 Consultation Fee Payment</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#718096' }}>Secure payment gateway</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#718096' }}>✕</button>
        </div>

        {/* Amount Summary */}
        <div style={{
          backgroundColor: '#ebf8ff', border: '1px solid #bee3f8',
          borderRadius: '10px', padding: '14px 18px', marginBottom: '18px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#2c5282' }}>Consultation with: <strong>{doctorName}</strong></div>
            <div style={{ fontSize: '0.78rem', color: '#4a5568' }}>Date: {appointment?.appointmentDate}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase' }}>Amount Due</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#2b6cb0' }}>₹{fee}</div>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', backgroundColor: '#fed7d7', color: '#9b2c2c', borderRadius: '8px', marginBottom: '14px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {/* Payment Method Selector */}
        <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '8px' }}>
          Select Payment Method:
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '18px' }}>
          {[
            { id: 'UPI', label: '📱 UPI', sub: 'GPay, PhonePe, Paytm' },
            { id: 'DEBIT_CARD', label: '💳 Card', sub: 'Debit / Credit' },
            { id: 'CASH', label: '💵 Cash', sub: 'Pay at Clinic' }
          ].map((m) => {
            const isSelected = method === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                style={{
                  padding: '10px 8px', borderRadius: '8px', textAlign: 'center',
                  border: isSelected ? '2px solid #3182ce' : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#ebf8ff' : '#f7fafc',
                  cursor: 'pointer', transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontWeight: isSelected ? 'bold' : '600', color: isSelected ? '#2b6cb0' : '#4a5568', fontSize: '0.9rem' }}>
                  {m.label}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#718096', marginTop: '2px' }}>
                  {m.sub}
                </div>
              </button>
            );
          })}
        </div>

        <form onSubmit={handlePay}>
          {/* UPI Form */}
          {method === 'UPI' && (
            <div style={{ backgroundColor: '#f7fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '6px' }}>
                  Quick UPI App:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Google Pay', 'PhonePe', 'Paytm', 'BHIM'].map((app) => (
                    <button
                      key={app}
                      type="button"
                      onClick={() => setUpiApp(app)}
                      style={{
                        flex: 1, padding: '6px 4px', fontSize: '0.75rem', borderRadius: '6px',
                        border: upiApp === app ? '2px solid #3182ce' : '1px solid #cbd5e0',
                        backgroundColor: upiApp === app ? '#fff' : '#edf2f7',
                        fontWeight: upiApp === app ? 'bold' : 'normal',
                        cursor: 'pointer'
                      }}
                    >
                      {app}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '6px' }}>
                  Or Enter UPI ID / VPA:
                </label>
                <input
                  type="text"
                  placeholder="e.g. mobile@upi or username@okhdfcbank"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}

          {/* Debit / Credit Card Form */}
          {method === 'DEBIT_CARD' && (
            <div style={{ backgroundColor: '#f7fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '4px' }}>
                  Card Number
                </label>
                <input
                  type="text"
                  placeholder="4532 8921 4402 1928"
                  maxLength={19}
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '4px' }}>
                  Cardholder Name
                </label>
                <input
                  type="text"
                  placeholder="Name on card"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '4px' }}>
                    Expiry (MM/YY)
                  </label>
                  <input
                    type="text"
                    placeholder="12/28"
                    maxLength={5}
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '4px' }}>
                    CVV
                  </label>
                  <input
                    type="password"
                    placeholder="•••"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Cash at Clinic */}
          {method === 'CASH' && (
            <div style={{ backgroundColor: '#fefcbf', padding: '14px', borderRadius: '8px', border: '1px solid #faf089', marginBottom: '18px', fontSize: '0.85rem', color: '#744210' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>💵 Pay Cash at Clinic Front Desk</div>
              <p style={{ margin: 0, lineHeight: '1.4' }}>
                You can pay ₹{fee} in cash directly at the clinic/hospital reception counter upon arrival for your visit. Your appointment record will be marked accordingly.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e0', background: '#fff', cursor: 'pointer', fontSize: '0.88rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              style={{
                padding: '9px 20px', borderRadius: '6px', border: 'none',
                background: method === 'CASH' ? '#d69e2e' : '#2b6cb0',
                color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.88rem'
              }}
            >
              {processing ? 'Processing...' : method === 'CASH' ? 'Confirm Cash on Arrival' : `Pay ₹${fee} via ${method}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
