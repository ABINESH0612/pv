import React from 'react';

export default function Footer({ setActivePage }) {
  const handleNav = (page) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="footer-editorial">
      <div className="container">
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-brand">
            <h3>PV NUTRITION CENTER</h3>
            <div className="footer-tagline">HEALTH IS WEALTH</div>
            <p className="footer-desc">
              Personalized nutrition guidance from trusted wellness coaches in Thanjavur.
              Helping individuals and families achieve sustainable vitality, balanced weight,
              and conscious everyday living.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <div className="footer-col-title">Navigation</div>
            <ul className="footer-links-list">
              <li>
                <a href="#home" onClick={(e) => { e.preventDefault(); handleNav('home'); }}>
                  Home
                </a>
              </li>
              <li>
                <a href="#about" onClick={(e) => { e.preventDefault(); handleNav('about'); }}>
                  About Us
                </a>
              </li>
              <li>
                <a href="#coaches" onClick={(e) => { e.preventDefault(); handleNav('coaches'); }}>
                  Meet Our Coaches
                </a>
              </li>
              <li>
                <a href="#contact" onClick={(e) => { e.preventDefault(); handleNav('contact'); }}>
                  Contact & Location
                </a>
              </li>
            </ul>
          </div>

          {/* Center Address & Coaches */}
          <div>
            <div className="footer-col-title">Center Location</div>
            <div className="footer-address">
              <p style={{ color: '#FAFDF7', fontWeight: '500', marginBottom: '0.35rem' }}>
                PV Nutrition Center
              </p>
              <p>No. 52 6A, AVP Alagammal Nagar,</p>
              <p>Indian Electrical Floor (Opp. Indian Bank, Barbe Queen),</p>
              <p>Trichy Road, New Bus Stand, Thanjavur - 613 005.</p>
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(250, 253, 247, 0.1)' }}>
                <p>Palani Manickam: 90477 93275</p>
                <p>Vijayashanthi: 74182 78569</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <div>&copy; {new Date().getFullYear()} PV Nutrition Center. All rights reserved.</div>
          <div>HEALTH IS WEALTH &bull; Certified Wellness Coaching</div>
        </div>
      </div>
    </footer>
  );
}
