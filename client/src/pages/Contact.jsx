import React from 'react';

export default function Contact({ setActivePage }) {
  return (
    <div className="section section-spacious">
      <div className="container">
        <div className="section-header">
          <span className="editorial-eyebrow">Connect With Us</span>
          <h1 className="section-title">Contact PV Nutrition Center</h1>
          <p className="section-desc">
            Visit our physical wellness center in Thanjavur or connect directly with our wellness coaches.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', maxWidth: '980px', margin: '0 auto 4rem' }}>
          {/* Location Card */}
          <div className="card">
            <span className="editorial-eyebrow">Center Address</span>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.75rem', fontWeight: '500' }}>Thanjavur Center</h3>
            <p style={{ color: 'var(--color-dark)', fontWeight: '500', marginBottom: '0.5rem' }}>
              PV Nutrition Center
            </p>
            <p style={{ color: 'var(--color-muted-sage)', lineHeight: '1.7', fontSize: '0.94rem', marginBottom: '1.75rem' }}>
              No. 52 6A, AVP Alagammal Nagar, Indian Electrical Floor,<br />
              (Opp. Indian Bank, Barbe Queen), Trichy Road,<br />
              New Bus Stand, Thanjavur - 613 005.
            </p>
            <span className="badge badge-success">Open for Consultations</span>
          </div>

          {/* Direct Coach Contacts */}
          <div className="card">
            <span className="editorial-eyebrow">Direct Contact</span>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontWeight: '500' }}>Wellness Coaches</h3>

            <div style={{ marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '1.15rem', color: 'var(--color-dark)', fontWeight: '500' }}>Palani Manickam</div>
              <div style={{ fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-earth-brown)', fontWeight: '600', marginBottom: '0.4rem' }}>Wellness Coach</div>
              <div style={{ fontSize: '0.98rem', color: 'var(--color-dark)' }}>Phone: <strong>90477 93275</strong></div>
            </div>

            <div>
              <div style={{ fontSize: '1.15rem', color: 'var(--color-dark)', fontWeight: '500' }}>Vijayashanthi</div>
              <div style={{ fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-earth-brown)', fontWeight: '600', marginBottom: '0.4rem' }}>Wellness Coach</div>
              <div style={{ fontSize: '0.98rem', color: 'var(--color-dark)' }}>Phone: <strong>74182 78569</strong></div>
            </div>
          </div>
        </div>

        {/* Online Consultation Callout */}
        <div className="card card-tinted" style={{ maxWidth: '980px', margin: '0 auto', textAlign: 'center', padding: '3rem 2rem' }}>
          <span className="editorial-eyebrow">Digital Access</span>
          <h3 style={{ fontSize: '1.8rem', fontWeight: '400', marginBottom: '0.75rem' }}>
            Book Your Online Consultation
          </h3>
          <p style={{ color: 'var(--color-muted-sage)', maxWidth: '580px', margin: '0 auto 2rem', fontSize: '0.96rem' }}>
            Choose your wellness coach online, complete secure payment through Razorpay, and access private 1-on-1 text chat from the comfort of your home.
          </p>
          <button className="btn btn-primary" onClick={() => setActivePage('coaches')}>
            Explore Coaches &amp; Consult <span className="btn-arrow">&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
}
