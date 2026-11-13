import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  HeartPulse,
  Scale,
  Calendar,
  Clock,
  MessageSquare,
  FileText,
  Plus,
  Edit2,
  AlertCircle,
  CheckCircle,
  Activity,
  ArrowRight,
  TrendingDown,
  UserCheck
} from 'lucide-react';

export default function CustomerDashboard({
  setActivePage,
  setSelectedCoachId,
  setActiveConsultationId
}) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [newProgress, setNewProgress] = useState({
    weight_kg: '',
    waist_inches: '',
    chest_inches: '',
    water_liters: '2.5',
    energy_level: '7',
    notes: ''
  });

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    gender: 'Male',
    age: '',
    dob: ''
  });

  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState('10:00 AM - 10:30 AM');

  const [receiptPaymentId, setReceiptPaymentId] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const fetchDashboard = async () => {
    if (!user) {
      setActivePage('login');
      return;
    }

    try {
      const [dashRes, progRes] = await Promise.all([
        api.getCustomerDashboard(),
        api.getProgress(user.id)
      ]);

      if (dashRes.error) {
        setError(dashRes.error);
      } else {
        setData(dashRes);
        setProfileForm({
          name: dashRes.customer?.name || '',
          phone: dashRes.customer?.phone || '',
          gender: dashRes.customer?.gender || 'Male',
          age: dashRes.customer?.age || '',
          dob: dashRes.customer?.dob || ''
        });
      }

      if (progRes && progRes.records) {
        setProgressData(progRes.records);
      }
    } catch (err) {
      setError('Failed to load customer dashboard.');
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

  const handleAddProgressSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.addProgressRecord(newProgress);
      setShowProgressModal(false);
      setNewProgress({
        weight_kg: '',
        waist_inches: '',
        chest_inches: '',
        water_liters: '2.5',
        energy_level: '7',
        notes: ''
      });
      fetchDashboard();
    } catch (e) {
      alert('Failed to log progress');
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.updateProfile(profileForm);
      setShowProfileModal(false);
      fetchDashboard();
    } catch (e) {
      alert('Failed to update profile');
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleItem) return;
    try {
      const res = await api.rescheduleConsultation(rescheduleItem.id, rescheduleDate, rescheduleSlot, 'Customer requested reschedule');
      if (res.error) {
        alert(res.error);
      } else {
        setRescheduleItem(null);
        fetchDashboard();
      }
    } catch (e) {
      alert('Failed to reschedule');
    }
  };

  const handleCancelConsultation = async (consultationId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await api.cancelConsultation(consultationId, 'Customer cancellation');
      fetchDashboard();
    } catch (e) {
      alert('Failed to cancel');
    }
  };

  const handleViewReceipt = async (paymentId) => {
    try {
      const res = await api.getPaymentReceipt(paymentId);
      setReceiptData(res);
      setShowReceiptModal(true);
    } catch (e) {
      alert('Failed to load receipt');
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm('Are you sure you want to deactivate your account? This action will disable future logins.')) return;
    try {
      await api.deactivateAccount();
      setActivePage('home');
      window.location.reload();
    } catch (e) {
      alert('Failed to deactivate');
    }
  };

  if (loading) {
    return (
      <div className="section" style={{ textAlign: 'center', padding: '5rem 0' }}>
        <div className="spinner" style={{ marginBottom: '1rem' }}></div>
        <p style={{ color: 'var(--color-muted-sage)' }}>Loading your dashboard...</p>
      </div>
    );
  }

  // Calculate Progress Stats
  const startingWeight = progressData.length > 0 ? progressData[0].weight_kg : data?.assessment?.weight_kg || 0;
  const currentWeight = progressData.length > 0 ? progressData[progressData.length - 1].weight_kg : startingWeight;
  const targetWeight = Number(data?.assessment?.target_weight_kg) || (startingWeight ? startingWeight - 5 : 0);
  const weightChange = startingWeight ? (currentWeight - startingWeight).toFixed(1) : 0;

  return (
    <div className="section section-spacious">
      <div className="container">
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem', flexWrap: 'wrap', gap: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.75rem' }}>
          <div>
            <span className="editorial-eyebrow">Customer Portal &bull; Wellness Journey</span>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '400', margin: '0.25rem 0' }}>
              Welcome, {data?.customer?.name}
            </h1>
            <p style={{ color: 'var(--color-muted-sage)' }}>
              Track your consultations, health assessment, and weekly body transformation.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowProfileModal(true)}>
              <Edit2 size={15} style={{ marginRight: '6px' }} /> Edit Profile
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setActivePage('coaches')}>
              Book Consultation &rarr;
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '2rem' }}>{error}</div>}

        {/* 3 Metric Cards: Assessment, Weight Progress, Active Consultations */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.75rem', marginBottom: '3rem' }}>
          {/* Card 1: Health Assessment Status (Module 5) */}
          <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <span className="editorial-eyebrow">Module 5</span>
                <HeartPulse size={24} color="var(--color-logo-green)" />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '500', marginBottom: '0.4rem' }}>
                Health Assessment
              </h3>
              {data?.hasAssessment ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                    <span className="badge badge-success">✓ Completed &amp; Verified</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-dark)', fontWeight: '600' }}>BMI: {data.assessment.bmi}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-muted-sage)', lineHeight: 1.5 }}>
                    Goal: {data.assessment.wellness_goals || 'Vitality & Balanced Nutrition'}
                  </p>
                </div>
              ) : (
                <div>
                  <span className="badge badge-warning" style={{ margin: '0.5rem 0', display: 'inline-block' }}>
                    Pending Submission
                  </span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-muted-sage)' }}>
                    Complete your digital intake form so your coach can formulate your personalized diet.
                  </p>
                </div>
              )}
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setActivePage('health-assessment')}
              style={{ marginTop: '1.25rem', width: '100%' }}
            >
              {data?.hasAssessment ? 'Update Health Form' : 'Fill Health Assessment &rarr;'}
            </button>
          </div>

          {/* Card 2: Current Weight & Transformation Progress (Module 11) */}
          <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <span className="editorial-eyebrow">Module 11</span>
                <Scale size={24} color="var(--color-logo-teal)" />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '500', marginBottom: '0.4rem' }}>
                Wellness Transformation
              </h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', margin: '0.5rem 0' }}>
                <span style={{ fontSize: '2.4rem', fontWeight: '700', fontFamily: 'var(--font-serif)', color: 'var(--color-dark)' }}>
                  {currentWeight ? `${currentWeight} kg` : 'Not Logged'}
                </span>
                {weightChange !== 0 && (
                  <span style={{ fontSize: '0.9rem', color: weightChange <= 0 ? 'var(--color-logo-green)' : '#D97706', fontWeight: '600' }}>
                    {weightChange <= 0 ? `${weightChange} kg` : `+${weightChange} kg`}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-muted-sage)' }}>
                Target Goal: <strong>{targetWeight || '70'} kg</strong> &bull; Logs: <strong>{progressData.length} entries</strong>
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowProgressModal(true)}
              style={{ marginTop: '1.25rem', width: '100%' }}
            >
              + Log Weekly Progress
            </button>
          </div>

          {/* Card 3: Active Consultations (Module 6) */}
          <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <span className="editorial-eyebrow">Module 6 &amp; 9</span>
                <MessageSquare size={24} color="var(--color-logo-blue)" />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '500', marginBottom: '0.4rem' }}>
                Coach Consultations
              </h3>
              <div style={{ fontSize: '2.4rem', fontWeight: '700', fontFamily: 'var(--font-serif)', color: 'var(--color-dark)', margin: '0.5rem 0' }}>
                {data?.consultations?.length || 0}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted-sage)' }}>
                Paid sessions with Palani Manickam or Vijayashanthi.
              </p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setActivePage('coaches')}
              style={{ marginTop: '1.25rem', width: '100%' }}
            >
              Book New Session &rarr;
            </button>
          </div>
        </div>

        {/* =========================================================================
            MODULE 11: INTERACTIVE WELLNESS PROGRESS TRACKING & CHART
            ========================================================================= */}
        <div className="progress-chart-card" style={{ marginBottom: '3.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="editorial-eyebrow">Module 11 &bull; Progress Visualization</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '500' }}>Weight &amp; Metric Changes</h2>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowProgressModal(true)}>
              <Plus size={15} style={{ marginRight: '4px' }} /> Add Progress Entry
            </button>
          </div>

          {/* Interactive SVG Trend Chart */}
          {progressData.length < 2 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-surface-tint)', borderRadius: 'var(--radius-md)' }}>
              <Activity size={32} color="var(--color-logo-green)" style={{ margin: '0 auto 0.5rem' }} />
              <p style={{ color: 'var(--color-muted-sage)', fontSize: '0.92rem' }}>
                Log at least 2 weekly progress entries to view your interactive transformation trendline.
              </p>
            </div>
          ) : (
            <div>
              <div className="svg-chart-wrapper">
                <svg viewBox="0 0 600 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  {/* Grid Lines */}
                  <line x1="40" y1="30" x2="580" y2="30" stroke="rgba(0,0,0,0.06)" />
                  <line x1="40" y1="90" x2="580" y2="90" stroke="rgba(0,0,0,0.06)" />
                  <line x1="40" y1="150" x2="580" y2="150" stroke="rgba(0,0,0,0.06)" />

                  {/* Target Goal Line */}
                  <line x1="40" y1="130" x2="580" y2="130" className="chart-goal-line" />
                  <text x="585" y="134" fontSize="11" fill="#D97706" fontWeight="600">Goal ({targetWeight}kg)</text>

                  {/* Dynamic Trend Line */}
                  {(() => {
                    const minW = Math.min(...progressData.map(p => p.weight_kg), targetWeight || 65) - 2;
                    const maxW = Math.max(...progressData.map(p => p.weight_kg)) + 2;
                    const rangeW = maxW - minW || 1;

                    const points = progressData.map((p, idx) => {
                      const x = 50 + (idx / (progressData.length - 1)) * 500;
                      const y = 170 - ((p.weight_kg - minW) / rangeW) * 130;
                      return { x, y, ...p };
                    });

                    const pathString = points.reduce((acc, pt, idx) => {
                      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
                    }, '');

                    return (
                      <>
                        <path d={pathString} className="chart-line" />
                        {points.map((pt, idx) => (
                          <g key={idx}>
                            <circle cx={pt.x} cy={pt.y} r="5" className="chart-dot" />
                            <text x={pt.x} y={pt.y - 10} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-dark)">
                              {pt.weight_kg}kg
                            </text>
                            <text x={pt.x} y="190" textAnchor="middle" fontSize="10" fill="var(--color-muted-sage)">
                              {new Date(pt.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>

              {/* Progress History Cards & Coach Feedback */}
              <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--color-earth-brown)' }}>
                  Recent Progress Log &amp; Coach Feedback
                </span>
                {progressData.slice(-3).reverse().map((record) => (
                  <div key={record.id} style={{ background: 'var(--bg-surface-tint)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontWeight: '600', color: 'var(--color-dark)' }}>
                        Date: {record.date} &bull; Weight: {record.weight_kg} kg &bull; Waist: {record.waist_inches || '-'} in
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-muted-sage)' }}>
                        Hydration: {record.water_liters}L &bull; Energy: {record.energy_level}/10
                      </span>
                    </div>

                    {record.notes && (
                      <p style={{ fontSize: '0.88rem', color: 'var(--color-muted-sage)', margin: '0 0 0.5rem' }}>
                        <em>Your Notes:</em> "{record.notes}"
                      </p>
                    )}

                    {record.coach_feedback ? (
                      <div style={{ background: '#fff', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-logo-green)', fontSize: '0.88rem' }}>
                        <strong style={{ color: 'var(--color-logo-blue)' }}>Coach Feedback: </strong>
                        <span style={{ color: 'var(--color-dark)' }}>{record.coach_feedback}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-sage)', fontStyle: 'italic' }}>
                        Coach review pending for this entry.
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medical Disclaimer per Module 11 */}
          <div style={{ marginTop: '1.5rem', padding: '0.75rem 1rem', background: 'rgba(6,9,4,0.03)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--color-muted-sage)', textAlign: 'center' }}>
            * Disclaimer: Measurements, body composition, and progress metrics presented are strictly for wellness tracking and nutrition habit support, not for medical diagnosis or clinical prescription.
          </div>
        </div>

        {/* =========================================================================
            MODULE 6: CONSULTATIONS, SCHEDULES & CHAT ACCESS
            ========================================================================= */}
        <div style={{ marginBottom: '3.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <span className="editorial-eyebrow">Module 6 &bull; Scheduling &amp; Status</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '500' }}>Your Booked Consultations</h2>
            </div>
          </div>

          {(!data?.consultations || data.consultations.length === 0) ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <p style={{ color: 'var(--color-muted-sage)', marginBottom: '1.5rem' }}>
                You have not booked any wellness consultations yet.
              </p>
              <button className="btn btn-primary" onClick={() => setActivePage('coaches')}>
                View Coaches &amp; Book Consultation
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {data.consultations.map((item) => (
                <div key={item.id} className="card" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <span className="badge" style={{ background: 'var(--bg-surface-tint)', color: 'var(--color-dark)', marginBottom: '0.35rem' }}>
                        {item.service_name || 'Wellness Consultation'}
                      </span>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: '500', color: 'var(--color-dark)' }}>
                        Coach {item.coach_name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.88rem', color: 'var(--color-muted-sage)', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={14} /> {item.date}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={14} /> {item.time_slot}
                        </span>
                        <span>Fee: ₹{item.fee}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${item.status === 'confirmed' || item.status === 'paid' ? 'badge-success' : item.status === 'completed' ? 'badge-neutral' : 'badge-warning'}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {item.status !== 'cancelled' && (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setRescheduleItem(item);
                              setRescheduleDate(item.date);
                            }}
                          >
                            Reschedule
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: '#DC2626' }}
                            onClick={() => handleCancelConsultation(item.id)}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>

                    <div>
                      {item.chat_unlocked ? (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleOpenChat(item.id)}
                        >
                          <MessageSquare size={15} style={{ marginRight: '6px' }} />
                          Open 1-on-1 Chat
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setSelectedCoachId(item.coach_id);
                            setActivePage('payment');
                          }}
                        >
                          Complete Payment (Unlock Chat) &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* =========================================================================
            MODULE 8: PAYMENT HISTORY
            ========================================================================= */}
        <div style={{ marginBottom: '3.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <span className="editorial-eyebrow">Module 8 &bull; Transactions</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '500' }}>Payment &amp; Receipt History</h2>
            </div>
          </div>

          {(!data?.payments || data.payments.length === 0) ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted-sage)' }}>
              No payments recorded yet.
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--bg-surface-tint)' }}>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--color-muted-sage)' }}>Transaction ID</th>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--color-muted-sage)' }}>Date</th>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--color-muted-sage)' }}>Amount</th>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--color-muted-sage)' }}>Status</th>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--color-muted-sage)', textAlign: 'right' }}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: '500', fontSize: '0.88rem' }}>
                        {p.razorpay_payment_id || p.id}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.88rem', color: 'var(--color-muted-sage)' }}>
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--color-dark)' }}>
                        ₹{p.amount}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span className={`badge ${p.status === 'successful' ? 'badge-success' : p.status === 'refunded' ? 'badge-neutral' : 'badge-warning'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleViewReceipt(p.id)}
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                        >
                          <FileText size={14} style={{ marginRight: '4px' }} /> View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Account Deactivation Option (Module 14) */}
        <div style={{ textAlign: 'right', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
          <button
            onClick={handleDeactivate}
            style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Deactivate My Customer Account
          </button>
        </div>

        {/* =========================================================================
            MODAL 1: ADD PROGRESS RECORD (MODULE 11)
            ========================================================================= */}
        {showProgressModal && (
          <div className="modal-overlay" onClick={() => setShowProgressModal(false)}>
            <div className="modal-container modal-card-animated" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>Log Weekly Progress</h3>
              <form onSubmit={handleAddProgressSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Current Weight (kg) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      className="form-input"
                      placeholder="e.g. 77.5"
                      value={newProgress.weight_kg}
                      onChange={(e) => setNewProgress({ ...newProgress, weight_kg: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Waist (inches)</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-input"
                      placeholder="e.g. 33.5"
                      value={newProgress.waist_inches}
                      onChange={(e) => setNewProgress({ ...newProgress, waist_inches: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Water Intake (Liters)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      placeholder="e.g. 3.0"
                      value={newProgress.water_liters}
                      onChange={(e) => setNewProgress({ ...newProgress, water_liters: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Energy Level (1-10)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="form-input"
                      placeholder="8"
                      value={newProgress.energy_level}
                      onChange={(e) => setNewProgress({ ...newProgress, energy_level: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Weekly Notes &amp; Observations</label>
                  <textarea
                    rows={2}
                    className="form-input"
                    placeholder="e.g. Completed 21-day morning routine, feeling much lighter and alert"
                    value={newProgress.notes}
                    onChange={(e) => setNewProgress({ ...newProgress, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowProgressModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Progress Entry
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 2: EDIT PROFILE (MODULE 4)
            ========================================================================= */}
        {showProfileModal && (
          <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
            <div className="modal-container modal-card-animated" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>Edit Customer Profile</h3>
              <form onSubmit={handleProfileSubmit}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    required
                    className="form-input"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select
                      className="form-input"
                      value={profileForm.gender}
                      onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Age</label>
                    <input
                      type="number"
                      className="form-input"
                      value={profileForm.age}
                      onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowProfileModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Update Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 3: RESCHEDULE CONSULTATION (MODULE 6)
            ========================================================================= */}
        {rescheduleItem && (
          <div className="modal-overlay" onClick={() => setRescheduleItem(null)}>
            <div className="modal-container modal-card-animated" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Reschedule Appointment</h3>
              <p style={{ color: 'var(--color-muted-sage)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                With Coach {rescheduleItem.coach_name}
              </p>
              <form onSubmit={handleRescheduleSubmit}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">New Appointment Date</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="form-input"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">New Time Slot</label>
                  <select
                    className="form-input"
                    value={rescheduleSlot}
                    onChange={(e) => setRescheduleSlot(e.target.value)}
                  >
                    <option value="09:00 AM - 09:30 AM">09:00 AM - 09:30 AM</option>
                    <option value="10:00 AM - 10:30 AM">10:00 AM - 10:30 AM</option>
                    <option value="11:30 AM - 12:00 PM">11:30 AM - 12:00 PM</option>
                    <option value="02:00 PM - 02:30 PM">02:00 PM - 02:30 PM</option>
                    <option value="04:00 PM - 04:30 PM">04:00 PM - 04:30 PM</option>
                    <option value="06:00 PM - 06:30 PM">06:00 PM - 06:30 PM</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setRescheduleItem(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Confirm Reschedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODAL 4: PAYMENT RECEIPT (MODULE 8)
            ========================================================================= */}
        {showReceiptModal && receiptData && (
          <div className="modal-overlay" onClick={() => setShowReceiptModal(false)}>
            <div className="modal-container modal-card-animated" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
              <div className="receipt-container">
                <div className="receipt-header">
                  <div style={{ fontWeight: '700', fontSize: '1.4rem', color: 'var(--color-logo-blue)' }}>
                    PV NUTRITION CENTER
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-muted-sage)' }}>
                    {receiptData.centre?.tagline}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-muted-sage)', marginTop: '0.25rem' }}>
                    {receiptData.centre?.address}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <div>
                    <div><strong>Receipt No:</strong> {receiptData.receiptNumber}</div>
                    <div><strong>Date:</strong> {new Date(receiptData.date).toLocaleDateString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div><strong>Customer:</strong> {receiptData.customerName}</div>
                    <div><strong>Phone:</strong> {receiptData.customerPhone}</div>
                  </div>
                </div>

                <table className="receipt-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Coach</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{receiptData.serviceName}</td>
                      <td>{receiptData.coachName}</td>
                      <td style={{ textAlign: 'right', fontWeight: '600' }}>₹{receiptData.amount}</td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'right', fontWeight: '500', color: 'var(--color-muted-sage)' }}>Total Paid</td>
                      <td style={{ textAlign: 'right', fontWeight: '700', fontSize: '1.1rem', color: 'var(--color-logo-green)' }}>₹{receiptData.amount}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-sage)', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginBottom: '1.5rem' }}>
                  Transaction Reference: {receiptData.razorpayPaymentId} &bull; Status: Verified
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                    Print Receipt
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowReceiptModal(false)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
