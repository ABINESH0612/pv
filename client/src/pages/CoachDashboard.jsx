import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  HeartPulse,
  FileText,
  MessageSquare,
  Clock,
  Calendar,
  CheckCircle,
  Edit3,
  X,
  User,
  Activity,
  Award
} from 'lucide-react';

export default function CoachDashboard({
  setActivePage,
  setActiveConsultationId
}) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Health Assessment Inspection Modal
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [assessmentCustomer, setAssessmentCustomer] = useState(null);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);

  // Private Coaching Notes Modal
  const [editingNotesConsultation, setEditingNotesConsultation] = useState(null);
  const [coachNotesText, setCoachNotesText] = useState('');

  // Progress Feedback Modal
  const [feedbackCustomer, setFeedbackCustomer] = useState(null);
  const [customerProgressRecords, setCustomerProgressRecords] = useState([]);
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const fetchDashboard = async () => {
    if (!user) {
      setActivePage('login');
      return;
    }
    if (user.role !== 'coach') {
      setError('Unauthorized access. Coach credentials required.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.getCoachDashboard();
      if (res.error) {
        setError(res.error);
      } else {
        setData(res);
      }
    } catch (err) {
      setError('Failed to load coach dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  const handleOpenChat = (consultationId) => {
    setActiveConsultationId(consultationId);
    setActivePage('chat');
  };

  const handleInspectAssessment = async (customerId, customerName) => {
    try {
      const res = await api.getCustomerHealthAssessmentForCoach(customerId);
      setSelectedAssessment(res.assessment);
      setAssessmentCustomer(res.customer || { name: customerName });
      setShowAssessmentModal(true);
    } catch (e) {
      alert('Failed to load customer health assessment');
    }
  };

  const handleOpenNotes = (consultation) => {
    setEditingNotesConsultation(consultation);
    setCoachNotesText(consultation.coach_notes || '');
  };

  const handleSaveNotes = async () => {
    if (!editingNotesConsultation) return;
    try {
      await api.updateConsultationStatus(editingNotesConsultation.consultation_id, editingNotesConsultation.status, coachNotesText);
      setEditingNotesConsultation(null);
      fetchDashboard();
    } catch (e) {
      alert('Failed to save notes');
    }
  };

  const handleOpenFeedback = async (customerId, customerName) => {
    try {
      const res = await api.getProgress(customerId);
      setCustomerProgressRecords(res.records || []);
      setFeedbackCustomer({ id: customerId, name: customerName });
      setShowFeedbackModal(true);
      if (res.records?.length > 0) {
        setSelectedRecordId(res.records[res.records.length - 1].id);
        setFeedbackText(res.records[res.records.length - 1].coach_feedback || '');
      }
    } catch (e) {
      alert('Failed to load progress records');
    }
  };

  const handleSaveFeedback = async () => {
    if (!selectedRecordId || !feedbackText.trim()) return;
    try {
      await api.addProgressFeedback(selectedRecordId, feedbackText.trim());
      setShowFeedbackModal(false);
      setFeedbackText('');
      alert('Feedback shared with customer!');
    } catch (e) {
      alert('Failed to save feedback');
    }
  };

  if (loading) {
    return (
      <div className="section" style={{ textAlign: 'center', padding: '5rem 0' }}>
        <div className="spinner" style={{ marginBottom: '1rem' }}></div>
        <p style={{ color: 'var(--color-muted-sage)' }}>Loading coach console...</p>
      </div>
    );
  }

  return (
    <div className="section section-spacious">
      <div className="container">
        {/* Header Bar */}
        <div style={{ marginBottom: '3rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.75rem' }}>
          <span className="editorial-eyebrow">Module 10 &bull; Coach Portal</span>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '400', margin: '0.25rem 0' }}>
            Welcome, Coach {data?.coach?.name}
          </h1>
          <p style={{ color: 'var(--color-muted-sage)' }}>
            Manage verified client consultations, health assessments, coaching notes, and progress feedback.
          </p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '2rem' }}>{error}</div>}

        {/* Coach Overview Profile Card */}
        <div className="card" style={{ marginBottom: '3rem', padding: '2rem' }}>
          <div style={{ fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-earth-brown)', fontWeight: '600', marginBottom: '1.25rem' }}>
            Coach Information &amp; Schedule
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.75rem' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-sage)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Full Name</span>
              <strong style={{ fontSize: '1.1rem', color: 'var(--color-dark)' }}>{data?.coach?.name}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-sage)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Contact Phone</span>
              <strong style={{ fontSize: '1.05rem', color: 'var(--color-dark)' }}>{data?.coach?.phone}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-sage)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Working Hours</span>
              <strong style={{ fontSize: '1.05rem', color: 'var(--color-dark)' }}>{data?.coach?.working_hours || '08:00 AM - 08:00 PM'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-sage)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Active Consultations</span>
              <strong style={{ fontSize: '1.35rem', color: 'var(--color-logo-green)' }}>{data?.paidCustomers?.length || 0}</strong>
            </div>
          </div>
        </div>

        {/* =========================================================================
            MODULE 10: ASSIGNED CUSTOMER BOOKINGS & CONVERSATIONS
            ========================================================================= */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '400' }}>
              Assigned Consultations ({data?.paidCustomers?.length || 0})
            </h2>
          </div>

          {(!data?.paidCustomers || data.paidCustomers.length === 0) ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <p style={{ color: 'var(--color-muted-sage)' }}>
                No active paid consultations yet. When clients complete their booking and payment, they will be listed here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {data.paidCustomers.map((cust) => (
                <div key={cust.consultation_id} className="card" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <span className="badge" style={{ background: 'var(--bg-surface-tint)', color: 'var(--color-dark)', marginBottom: '0.35rem' }}>
                        {cust.service_name || 'Nutrition Consultation'}
                      </span>
                      <h3 style={{ fontSize: '1.45rem', fontWeight: '500', color: 'var(--color-dark)' }}>
                        {cust.customer_name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.88rem', color: 'var(--color-muted-sage)', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                        <span>Phone: {cust.customer_phone || 'N/A'}</span>
                        <span>Email: {cust.customer_email}</span>
                        {cust.date && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Calendar size={14} /> {cust.date} ({cust.time_slot})
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-success" style={{ marginBottom: '0.25rem', display: 'inline-block' }}>
                        ✓ Paid (₹{cust.fee})
                      </span>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-muted-sage)' }}>
                        Status: <strong>{cust.status || 'Confirmed'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Private Coach Notes Snippet */}
                  {cust.coach_notes && (
                    <div style={{ background: 'rgba(255, 243, 205, 0.4)', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid #FFEBAA', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
                      <strong style={{ color: '#856404' }}>Private Coaching Note: </strong>
                      <span style={{ color: 'var(--color-dark)' }}>{cust.coach_notes}</span>
                    </div>
                  )}

                  {/* Actions Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      {/* View Health Assessment (Module 5) */}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleInspectAssessment(cust.customer_id, cust.customer_name)}
                      >
                        <HeartPulse size={15} style={{ marginRight: '6px' }} color="var(--color-logo-green)" />
                        View Health Assessment
                      </button>

                      {/* Progress Feedback (Module 11) */}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenFeedback(cust.customer_id, cust.customer_name)}
                      >
                        <Activity size={15} style={{ marginRight: '6px' }} color="var(--color-logo-teal)" />
                        Review Progress ({cust.progressCount || 0})
                      </button>

                      {/* Private Notes (Module 10) */}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenNotes(cust)}
                      >
                        <Edit3 size={15} style={{ marginRight: '6px' }} />
                        {cust.coach_notes ? 'Edit Notes' : '+ Add Note'}
                      </button>
                    </div>

                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleOpenChat(cust.consultation_id)}
                    >
                      <MessageSquare size={15} style={{ marginRight: '6px' }} />
                      Open Consultation Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* =========================================================================
            MODAL 1: VIEW CUSTOMER HEALTH ASSESSMENT (MODULE 5)
            ========================================================================= */}
        {showAssessmentModal && (
          <div className="modal-overlay" onClick={() => setShowAssessmentModal(false)}>
            <div className="modal-container modal-card-animated" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <span className="editorial-eyebrow">Module 5 Intake Form</span>
                  <h3 style={{ fontSize: '1.5rem', margin: 0 }}>
                    Health Assessment: {assessmentCustomer?.name}
                  </h3>
                </div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowAssessmentModal(false)}>
                  <X size={20} />
                </button>
              </div>

              {!selectedAssessment ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted-sage)' }}>
                  Customer has not submitted their digital health assessment form yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Body Measurements & BMI */}
                  <div style={{ background: 'var(--bg-surface-tint)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-earth-brown)', marginBottom: '0.75rem' }}>
                      Baseline Metrics &amp; Body Measurements
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '1rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-sage)', display: 'block' }}>Height</span>
                        <strong>{selectedAssessment.height_cm} cm</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-sage)', display: 'block' }}>Weight</span>
                        <strong>{selectedAssessment.weight_kg} kg</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-sage)', display: 'block' }}>BMI</span>
                        <strong style={{ color: 'var(--color-logo-green)' }}>{selectedAssessment.bmi} ({selectedAssessment.bmi_category})</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-sage)', display: 'block' }}>Waist</span>
                        <strong>{selectedAssessment.waist_in || '-'} in</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-sage)', display: 'block' }}>Chest</span>
                        <strong>{selectedAssessment.chest_in || '-'} in</strong>
                      </div>
                    </div>
                  </div>

                  {/* Daily Habits & Lifestyle */}
                  <div style={{ background: 'var(--bg-surface-tint)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-earth-brown)', marginBottom: '0.75rem' }}>
                      Daily Food Habits &amp; Lifestyle
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', fontSize: '0.88rem' }}>
                      <div>
                        <span style={{ color: 'var(--color-muted-sage)', display: 'block' }}>Diet Preference:</span>
                        <strong>{selectedAssessment.diet_type || 'Non-Vegetarian'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-muted-sage)', display: 'block' }}>Water Intake:</span>
                        <strong>{selectedAssessment.water_liters || '2.5'} Liters / day</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-muted-sage)', display: 'block' }}>Sleep:</span>
                        <strong>{selectedAssessment.sleep_hours || '7'} hrs ({selectedAssessment.sleep_quality || 'Good'})</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-muted-sage)', display: 'block' }}>Exercise Habits:</span>
                        <strong>{selectedAssessment.exercise_habits || 'Light walking'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Medical History & Goals */}
                  <div style={{ background: 'var(--bg-surface-tint)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.88rem' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-earth-brown)', marginBottom: '0.75rem' }}>
                      Health Concerns &amp; Goals
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--color-muted-sage)' }}>Current Concerns: </span>
                      <strong>{selectedAssessment.health_concerns || 'None specified'}</strong>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--color-muted-sage)' }}>Allergies: </span>
                      <strong>{selectedAssessment.allergies || 'None'}</strong>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--color-muted-sage)' }}>Medications: </span>
                      <strong>{selectedAssessment.current_medications || 'None'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-muted-sage)' }}>Wellness Target: </span>
                      <strong style={{ color: 'var(--color-logo-blue)' }}>{selectedAssessment.wellness_goals || 'General Wellness'} (Goal: {selectedAssessment.target_weight_kg || '-'} kg)</strong>
                    </div>
                  </div>

                  {/* Consent confirmation */}
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-sage)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle size={14} color="var(--color-logo-green)" />
                    Customer Consent Verified: {selectedAssessment.consent_timestamp ? new Date(selectedAssessment.consent_timestamp).toLocaleString() : 'Yes'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 2: EDIT PRIVATE COACHING NOTES (MODULE 10)
            ========================================================================= */}
        {editingNotesConsultation && (
          <div className="modal-overlay" onClick={() => setEditingNotesConsultation(null)}>
            <div className="modal-container modal-card-animated" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>
                Private Coaching Notes
              </h3>
              <p style={{ color: 'var(--color-muted-sage)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                For {editingNotesConsultation.customer_name}. Only visible to you and administrators.
              </p>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <textarea
                  rows={4}
                  className="form-input"
                  placeholder="Record confidential observation, client dietary adjustments, or follow-up plans..."
                  value={coachNotesText}
                  onChange={(e) => setCoachNotesText(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setEditingNotesConsultation(null)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSaveNotes}>
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 3: PROGRESS FEEDBACK (MODULE 11)
            ========================================================================= */}
        {showFeedbackModal && feedbackCustomer && (
          <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
            <div className="modal-container modal-card-animated" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>
                Progress Review: {feedbackCustomer.name}
              </h3>
              <p style={{ color: 'var(--color-muted-sage)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Review client weekly logs and submit motivational feedback &amp; diet tweaks.
              </p>

              {customerProgressRecords.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted-sage)' }}>
                  Client has not logged any weekly weight updates yet.
                </div>
              ) : (
                <div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Select Progress Entry</label>
                    <select
                      className="form-input"
                      value={selectedRecordId || ''}
                      onChange={(e) => {
                        setSelectedRecordId(e.target.value);
                        const rec = customerProgressRecords.find(r => r.id === e.target.value);
                        setFeedbackText(rec?.coach_feedback || '');
                      }}
                    >
                      {customerProgressRecords.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.date} &bull; {r.weight_kg} kg &bull; Energy {r.energy_level}/10
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">Your Coach Feedback</label>
                    <textarea
                      rows={3}
                      className="form-input"
                      placeholder="e.g. Excellent 1.5kg drop this week! Remember to keep your daily water intake above 2.5L and continue morning walking."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={() => setShowFeedbackModal(false)}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleSaveFeedback}>
                      Send Feedback to Client
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
