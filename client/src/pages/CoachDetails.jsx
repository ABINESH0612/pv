import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function CoachDetails({
  coachId,
  setActivePage,
  setSelectedCoachId,
  setActiveConsultationId
}) {
  const { user } = useAuth();
  const [coach, setCoach] = useState(null);
  const [consultationStatus, setConsultationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      if (!coachId) {
        setActivePage('coaches');
        return;
      }
      try {
        setLoading(true);
        const coachData = await api.getCoach(coachId);
        if (coachData.error) {
          setError(coachData.error);
        } else {
          setCoach(coachData);
        }

        if (user && user.role === 'customer') {
          const statusRes = await api.getConsultationStatus(coachId);
          setConsultationStatus(statusRes);
        }
      } catch (err) {
        setError('Failed to load coach profile.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [coachId, user]);

  const handleProceedToPayment = () => {
    if (!user) {
      setSelectedCoachId(coachId);
      setActivePage('login');
      return;
    }
    setSelectedCoachId(coachId);
    setActivePage('payment');
  };

  const handleOpenChat = (consultationId) => {
    setActiveConsultationId(consultationId);
    setActivePage('chat');
  };

  if (loading) {
    return (
      <div className="section" style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
        <p style={{ color: 'var(--color-muted-sage)' }}>Loading coach profile...</p>
      </div>
    );
  }

  if (error || !coach) {
    return (
      <div className="section" style={{ textAlign: 'center' }}>
        <div className="alert alert-error" style={{ maxWidth: '500px', margin: '0 auto 1.5rem' }}>
          {error || 'Coach not found'}
        </div>
        <button className="btn btn-secondary" onClick={() => setActivePage('coaches')}>
          &larr; Back to Coaches
        </button>
      </div>
    );
  }

  const getCoachImage = (c) => {
    if (c?.image_url) return c.image_url;
    const name = (c?.name || '').toLowerCase();
    if (name.includes('palani')) return '/coach_palani.jpg';
    if (name.includes('vijay')) return '/coach_vijaya.jpg';
    return '/pv_logo.png';
  };

  return (
    <div className="section section-spacious">
      <div className="container">
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setActivePage('coaches')}
          style={{ marginBottom: '2.5rem' }}
        >
          &larr; Back to All Coaches
        </button>

        <div className="coach-detail-layout">
          {/* Left Column: Coach Photo & Overview */}
          <div className="coach-detail-media">
            <img
              src={getCoachImage(coach)}
              alt={coach.name}
              onError={(e) => {
                e.target.src = '/pv_logo.png';
                e.target.style.objectFit = 'contain';
                e.target.style.padding = '3rem';
              }}
            />
            <div className="coach-detail-info-block">
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--color-muted-sage)' }}>Center Contact</span>
                <span style={{ fontWeight: '600' }}>{coach.phone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--color-muted-sage)' }}>Consultation Mode</span>
                <span style={{ color: 'var(--color-dark)', fontWeight: '500' }}>Private 1-on-1 Text</span>
              </div>
            </div>
          </div>

          {/* Right Column: Editorial Profile & Booking */}
          <div>
            <span className="editorial-eyebrow">PV Nutrition Center</span>
            <h1 style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', marginBottom: '0.5rem', fontWeight: '400' }}>
              {coach.name}
            </h1>
            <div style={{ fontSize: '0.9rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-earth-brown)', fontWeight: '600', marginBottom: '2rem' }}>
              Wellness Coach
            </div>

            <div className="card" style={{ marginBottom: '2rem', padding: '2rem' }}>
              <div style={{ fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-muted-sage)', fontWeight: '600', marginBottom: '0.75rem' }}>
                About Coach
              </div>
              <p style={{ color: 'var(--color-dark)', fontSize: '1.05rem', lineHeight: '1.8', marginBottom: '1.25rem' }}>
                {coach.bio}
              </p>
              <p style={{ fontSize: '0.94rem', color: 'var(--color-muted-sage)', lineHeight: '1.7' }}>
                Consultations with Coach {coach.name} are held directly through our secure platform.
                Receive personal meal structure advice, nutrition adjustments, and routine habit coaching.
              </p>
            </div>

            {/* Consultation Booking Card */}
            <div className="card card-tinted" style={{ padding: '2.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-earth-brown)', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Consultation Price
                  </div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', color: 'var(--color-dark)', fontWeight: '600' }}>
                    ₹{coach.consultation_fee}
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.88rem', color: 'var(--color-muted-sage)', fontWeight: '400', marginLeft: '0.5rem' }}>
                      / online consultation
                    </span>
                  </div>
                </div>

                {consultationStatus && consultationStatus.isPaid ? (
                  <div>
                    <span className="badge badge-success" style={{ marginBottom: '0.75rem', display: 'block' }}>
                      ✓ Consultation Active
                    </span>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleOpenChat(consultationStatus.consultationId)}
                    >
                      Open Consultation Chat
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleProceedToPayment}
                  >
                    Book Consultation <span className="btn-arrow">&rarr;</span>
                  </button>
                )}
              </div>

              <div style={{ borderTop: '1px solid rgba(121, 138, 128, 0.2)', paddingTop: '1.15rem', fontSize: '0.85rem', color: 'var(--color-muted-sage)' }}>
                Protected via Razorpay. Your private consultation text chat with Coach {coach.name} unlocks immediately upon verified payment.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
