import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Bell, Check, User, HeartPulse, Sparkles } from 'lucide-react';

export default function Navbar({ activePage, setActivePage }) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch notifications if user is logged in
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.getNotifications();
      if (res && res.notifications) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000); // 10s poll
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  // Close notifications tray on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNav = (page) => {
    setActivePage(page);
    setMobileMenuOpen(false);
    setShowNotifications(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getDashboardRoute = () => {
    if (!user) return 'login';
    if (user.role === 'admin') return 'admin-dashboard';
    if (user.role === 'coach') return 'coach-dashboard';
    return 'customer-dashboard';
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await api.markNotificationRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setShowNotifications(false);
    if (notif.type === 'booking' || notif.type === 'payment') {
      handleNav(getDashboardRoute());
    }
  };

  return (
    <>
      {/* Top Wellness Strip */}
      <div className="top-bar">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-logo-green)' }}></span>
            <span>PV NUTRITION CENTER &bull; HEALTH IS WEALTH &bull; THANJAVUR</span>
          </div>
          <div className="top-bar-contact">
            <span>Coach Palani: 90477 93275</span>
            <span>&bull;</span>
            <span>Coach Vijayashanthi: 74182 78569</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="nav-wrapper">
          {/* Brand Logo */}
          <div className="brand-link" onClick={() => handleNav('home')}>
            <div className="brand-logo-container">
              <div className="brand-logo-aura"></div>
              <img src="/pv_logo.png" alt="PV Nutrition Center" className="brand-logo" />
            </div>
            <div className="brand-titles">
              <span className="brand-name">PV NUTRITION CENTER</span>
              <span className="brand-tagline">HEALTH IS WEALTH</span>
            </div>
          </div>

          {/* Navigation Links */}
          <ul className="nav-links">
            <li>
              <span
                className={`nav-link ${activePage === 'home' ? 'active' : ''}`}
                onClick={() => handleNav('home')}
              >
                Home
              </span>
            </li>
            <li>
              <span
                className={`nav-link ${activePage === 'services' ? 'active' : ''}`}
                onClick={() => handleNav('services')}
              >
                Services &amp; Packages
              </span>
            </li>
            <li>
              <span
                className={`nav-link ${activePage === 'coaches' || activePage === 'coach-details' ? 'active' : ''}`}
                onClick={() => handleNav('coaches')}
              >
                Coaches
              </span>
            </li>

            {/* Health Assessment for Customer */}
            {user && user.role === 'customer' && (
              <li>
                <span
                  className={`nav-link ${activePage === 'health-assessment' ? 'active' : ''}`}
                  onClick={() => handleNav('health-assessment')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <HeartPulse size={15} color="var(--color-logo-green)" />
                  Health Form
                </span>
              </li>
            )}

            <li>
              <span
                className={`nav-link ${activePage === 'about' ? 'active' : ''}`}
                onClick={() => handleNav('about')}
              >
                About
              </span>
            </li>
            <li>
              <span
                className={`nav-link ${activePage === 'contact' ? 'active' : ''}`}
                onClick={() => handleNav('contact')}
              >
                Contact
              </span>
            </li>

            {/* Dashboard Link for logged in user */}
            {user && (
              <li>
                <span
                  className={`nav-link ${
                    activePage === 'customer-dashboard' ||
                    activePage === 'coach-dashboard' ||
                    activePage === 'admin-dashboard'
                      ? 'active'
                      : ''
                  }`}
                  onClick={() => handleNav(getDashboardRoute())}
                  style={{ color: 'var(--color-logo-blue)', fontWeight: '600' }}
                >
                  {user.role === 'admin'
                    ? 'Admin Portal'
                    : user.role === 'coach'
                    ? 'Coach Portal'
                    : 'My Dashboard'}
                </span>
              </li>
            )}
          </ul>

          {/* Right Controls: Notifications & Actions */}
          <div className="nav-auth-buttons" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Notification Bell (Module 12) */}
            {user && (
              <div style={{ position: 'relative' }} ref={notifRef}>
                <button
                  type="button"
                  aria-label="Notifications"
                  onClick={() => setShowNotifications(!showNotifications)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    padding: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-dark)'
                  }}
                >
                  <Bell size={20} className={unreadCount > 0 ? 'bell-shake' : ''} />
                  {unreadCount > 0 && (
                    <span className="notification-badge">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown Tray */}
                {showNotifications && (
                  <div className="notification-tray">
                    <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface-tint)' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--color-dark)' }}>Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          style={{ background: 'none', border: 'none', color: 'var(--color-logo-green)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '600' }}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--color-muted-sage)', fontSize: '0.88rem' }}>
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`notification-item ${!notif.read ? 'unread' : ''}`}
                            onClick={() => handleNotificationClick(notif)}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                              <span style={{ fontWeight: notif.read ? '500' : '700', fontSize: '0.85rem', color: 'var(--color-dark)' }}>
                                {notif.title}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-sage)' }}>
                                {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.82rem', color: 'var(--color-muted-sage)', margin: 0, lineHeight: 1.4 }}>
                              {notif.message}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    logout();
                    handleNav('login');
                  }}
                >
                  Logout
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleNav('coaches')}
                >
                  Book Consultation <span className="btn-arrow">&rarr;</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleNav('login')}
                >
                  Login
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleNav('coaches')}
                >
                  Book Consultation <span className="btn-arrow">&rarr;</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            className="mobile-menu-toggle"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-nav-drawer">
            <span
              className={`mobile-nav-link ${activePage === 'home' ? 'active' : ''}`}
              onClick={() => handleNav('home')}
            >
              Home
            </span>
            <span
              className={`mobile-nav-link ${activePage === 'services' ? 'active' : ''}`}
              onClick={() => handleNav('services')}
            >
              Services &amp; Packages (₹100, ₹200, ₹300)
            </span>
            <span
              className={`mobile-nav-link ${activePage === 'coaches' || activePage === 'coach-details' ? 'active' : ''}`}
              onClick={() => handleNav('coaches')}
            >
              Meet Our Coaches
            </span>
            {user && user.role === 'customer' && (
              <span
                className={`mobile-nav-link ${activePage === 'health-assessment' ? 'active' : ''}`}
                onClick={() => handleNav('health-assessment')}
              >
                Digital Health Assessment Form
              </span>
            )}
            <span
              className={`mobile-nav-link ${activePage === 'about' ? 'active' : ''}`}
              onClick={() => handleNav('about')}
            >
              About PV Nutrition
            </span>
            <span
              className={`mobile-nav-link ${activePage === 'contact' ? 'active' : ''}`}
              onClick={() => handleNav('contact')}
            >
              Contact Us
            </span>
            {user && (
              <span
                className="mobile-nav-link"
                onClick={() => handleNav(getDashboardRoute())}
                style={{ fontWeight: '600', color: 'var(--color-logo-blue)' }}
              >
                {user.role === 'admin' ? 'Admin Console' : user.role === 'coach' ? 'Coach Portal' : 'My Dashboard'}
              </span>
            )}
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {user ? (
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    logout();
                    handleNav('login');
                  }}
                >
                  Logout ({user.name})
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={() => handleNav('login')}>
                  Login / Register
                </button>
              )}
              <button className="btn btn-primary" onClick={() => handleNav('coaches')}>
                Book Consultation Now &rarr;
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
