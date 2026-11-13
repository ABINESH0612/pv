import React from 'react';

export default function About({ setActivePage }) {
  return (
    <div className="section section-spacious">
      <div className="container">
        <div className="section-header">
          <span className="editorial-eyebrow">Our Philosophy</span>
          <h1 className="section-title">About PV Nutrition Center</h1>
          <p className="section-desc">
            Guided by our enduring conviction: <strong>"HEALTH IS WEALTH"</strong>.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '4rem', alignItems: 'center', marginBottom: '5rem' }}>
          <div>
            <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontWeight: '400', marginBottom: '1.5rem', lineHeight: '1.2' }}>
              Cultivating Lifelong Vitality in Thanjavur
            </h2>
            <p style={{ color: 'var(--color-dark)', fontSize: '1.08rem', lineHeight: '1.8', marginBottom: '1.25rem' }}>
              At <strong>PV Nutrition Center</strong>, we believe true wellness starts with mindful nourishment,
              natural lifestyle habits, and personalized guidance from mentors who genuinely care.
            </p>
            <p style={{ color: 'var(--color-muted-sage)', fontSize: '0.98rem', lineHeight: '1.75', marginBottom: '2.5rem' }}>
              Whether your aspiration is healthy weight management, enhanced digestive vitality, skin radiance,
              or balanced nutrition for your children, our certified wellness coaches Palani Manickam and Vijayashanthi
              provide 1-on-1 private consultation tailored to your body's rhythm.
            </p>

            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => setActivePage('coaches')}>
                Meet Our Coaches <span className="btn-arrow">&rarr;</span>
              </button>
              <button className="btn btn-secondary" onClick={() => setActivePage('contact')}>
                Visit Our Center <span className="btn-arrow">&rarr;</span>
              </button>
            </div>
          </div>

          <div>
            <div className="card" style={{ padding: '1rem', backgroundColor: 'var(--color-primary-bg)' }}>
              <img
                src="/solutions.jpg"
                alt="PV Nutrition Center Solutions Flyer"
                style={{ width: '100%', borderRadius: 'var(--radius-sm)', display: 'block' }}
              />
            </div>
          </div>
        </div>

        {/* Center Details Card */}
        <div className="card card-wellness-tint" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <span className="editorial-eyebrow">Physical Wellness Center</span>
          <h3 style={{ fontSize: '2rem', fontWeight: '400', marginBottom: '1rem' }}>
            Visit Us in Thanjavur
          </h3>
          <p style={{ color: 'var(--color-dark)', fontSize: '1.1rem', maxWidth: '720px', margin: '0 auto 2rem', lineHeight: '1.7' }}>
            No. 52 6A, AVP Alagammal Nagar, Indian Electrical Floor, (Opp. Indian Bank, Barbe Queen),
            Trichy Road, New Bus Stand, Thanjavur - 613 005.
          </p>

          <div style={{ display: 'inline-flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '0.85rem 1.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '0.92rem' }}>
              Coach Palani: <strong>90477 93275</strong>
            </div>
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '0.85rem 1.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '0.92rem' }}>
              Coach Vijayashanthi: <strong>74182 78569</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
