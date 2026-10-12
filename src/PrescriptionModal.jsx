import { useState } from 'react';
import { apiRequest } from './api';

export function CreatePrescriptionModal({ appointment, doctorId, patientId, onClose, onSuccess }) {
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState('');
  const [instructions, setInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!diagnosis.trim() || !medicines.trim()) {
      setError('Diagnosis and Medicines are required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await apiRequest('/prescriptions', {
        method: 'POST',
        body: JSON.stringify({
          patientId: patientId || (appointment && appointment.patient ? appointment.patient.id : null),
          doctorId: doctorId || (appointment && appointment.doctor ? appointment.doctor.id : null),
          appointmentId: appointment ? appointment.id : null,
          diagnosis: diagnosis.trim(),
          medicines: medicines.trim(),
          instructions: instructions.trim(),
        }),
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to issue prescription.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1100
    }}>
      <div className="modal-content" style={{
        backgroundColor: '#fff', borderRadius: '12px', padding: '24px',
        maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#2b6cb0' }}>📋 Issue Digital Prescription</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        {error && (
          <div style={{ padding: '10px', backgroundColor: '#fed7d7', color: '#9b2c2c', borderRadius: '6px', marginBottom: '12px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {appointment && (
            <div style={{ backgroundColor: '#ebf8ff', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem' }}>
              <strong>Patient:</strong> {appointment.patient ? appointment.patient.name : 'N/A'} <br />
              <strong>Date:</strong> {appointment.appointmentDate}
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '0.85rem' }}>Diagnosis *</label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Acute Bronchitis, Viral Fever"
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '0.85rem' }}>Medicines & Dosage *</label>
            <textarea
              value={medicines}
              onChange={(e) => setMedicines(e.target.value)}
              placeholder="e.g. Paracetamol 500mg - 1 tab 3x daily after food (5 days)&#10;Amoxicillin 500mg - 1 tab twice daily (7 days)"
              rows={4}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '0.85rem' }}>Advice / Instructions</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Drink plenty of water, rest for 3 days. Follow up after 1 week if fever persists."
              rows={3}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e0', background: '#fff', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#3182ce', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {submitting ? 'Issuing...' : 'Issue Prescription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ViewPrescriptionModal({ prescription, onClose }) {
  if (!prescription) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1100
    }}>
      <div className="modal-content printable-area" style={{
        backgroundColor: '#fff', borderRadius: '12px', padding: '28px',
        maxWidth: '650px', width: '90%', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)', color: '#2d3748'
      }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button
            onClick={handlePrint}
            style={{ padding: '8px 16px', backgroundColor: '#2b6cb0', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🖨️ Print / Save PDF
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Prescription Header */}
        <div style={{ borderBottom: '2px solid #3182ce', paddingBottom: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, color: '#2b6cb0', fontSize: '1.4rem' }}>
              Dr. {prescription.doctor ? prescription.doctor.name : 'N/A'}
            </h2>
            <div style={{ color: '#4a5568', fontSize: '0.9rem', fontWeight: 'bold' }}>
              {prescription.doctor ? prescription.doctor.specialization : ''}
            </div>
            {prescription.doctor && prescription.doctor.qualification && (
              <div style={{ color: '#718096', fontSize: '0.8rem' }}>
                Qualification: {prescription.doctor.qualification}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#718096' }}>
            <div style={{ fontWeight: 'bold', color: '#2b6cb0', fontSize: '1rem' }}>🏥 ONLINE MEDICAL CARE</div>
            <div>Date: {new Date(prescription.createdAt).toLocaleDateString()}</div>
            <div>Rx ID: #{prescription.id}</div>
          </div>
        </div>

        {/* Patient Details */}
        <div style={{ backgroundColor: '#edf2f7', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <strong>Patient Name:</strong> {prescription.patient ? prescription.patient.name : 'N/A'} <br />
            <strong>Email:</strong> {prescription.patient ? prescription.patient.email : 'N/A'}
          </div>
          {prescription.patient && prescription.patient.age && (
            <div>
              <strong>Age / Gender:</strong> {prescription.patient.age} yrs / {prescription.patient.gender || 'N/A'}
            </div>
          )}
        </div>

        {/* Diagnosis */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 6px 0', color: '#2c5282', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
            🩺 Diagnosis
          </h4>
          <div style={{ padding: '8px 12px', backgroundColor: '#feebc8', color: '#744210', borderRadius: '6px', fontWeight: '500' }}>
            {prescription.diagnosis}
          </div>
        </div>

        {/* Rx / Medicines */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#2c5282', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
            💊 Prescribed Medicines (Rx)
          </h4>
          <div style={{
            whiteSpace: 'pre-wrap', fontFamily: 'monospace', backgroundColor: '#f7fafc',
            padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', lineHeight: '1.6'
          }}>
            {prescription.medicines}
          </div>
        </div>

        {/* Instructions */}
        {prescription.instructions && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#2c5282', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
              📝 Advice & Instructions
            </h4>
            <div style={{ fontStyle: 'italic', color: '#4a5568', fontSize: '0.9rem', backgroundColor: '#f7fafc', padding: '10px', borderRadius: '6px' }}>
              {prescription.instructions}
            </div>
          </div>
        )}

        {/* Footer Signature */}
        <div style={{ marginTop: '30px', borderTop: '1px dashed #cbd5e0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#a0aec0' }}>
            * This digital prescription is generated electronically and is valid under Digital Healthcare Guidelines.
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'cursive', fontSize: '1.1rem', color: '#2b6cb0', marginBottom: '4px' }}>
              Dr. {prescription.doctor ? prescription.doctor.name : ''}
            </div>
            <div style={{ fontSize: '0.75rem', borderTop: '1px solid #cbd5e0', paddingTop: '2px', color: '#718096' }}>
              Doctor's Signature
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
