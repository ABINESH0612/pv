import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Coaches({ setActivePage, setSelectedCoachId }) {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCoaches() {
      try {
        const data = await api.getCoaches();
        setCoaches(Array.isArray(data) ? data : []);
      } catch (err) {
        setError('Failed to load coaches. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    }
    fetchCoaches();
  }, []);

  const handleSelectCoach = (coachId) => {
    setSelectedCoachId(coachId);
    setActivePage('coach-details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
        <div className="section-header reveal-on-scroll">
          <span className="editorial-eyebrow">Personalized Care</span>
          <h1 className="section-title">Meet Our Wellness Coaches</h1>
          <p className="section-desc">
            Choose your dedicated wellness coach to begin your confidential 1-on-1 nutrition consultation.
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p style={{ color: 'var(--color-muted-sage)' }}>Loading wellness coaches...</p>
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
            {error}
          </div>
        )}

        {!loading && coaches.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <p style={{ color: 'var(--color-muted-sage)' }}>No coaches currently listed.</p>
          </div>
        )}

        <div className="coaches-editorial-grid reveal-stagger" style={{ maxWidth: '960px', margin: '0 auto' }}>
          {coaches.map((coach) => (
            <div key={coach.id} className="coach-card-editorial">
              <div className="coach-card-photo-wrapper">
                <img
                  src={getCoachImage(coach)}
                  alt={coach.name}
                  className="coach-card-photo"
                  onError={(e) => {
                    e.target.src = '/pv_logo.png';
                    e.target.style.objectFit = 'contain';
                    e.target.style.padding = '2.5rem';
                  }}
                />
              </div>

              <div className="coach-card-body">
                <h2 className="coach-card-name">{coach.name}</h2>
                <div className="coach-card-role">Wellness Coach</div>
                <p className="coach-card-bio">{coach.bio}</p>

                <div className="coach-card-footer">
                  <div className="coach-card-price">
                    ₹{coach.consultation_fee} <span>/ consultation</span>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleSelectCoach(coach.id)}
                  >
                    View Profile <span className="btn-arrow">&rarr;</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
