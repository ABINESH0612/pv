import React, { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { KeyRound, CheckCircle, ArrowRight, X } from 'lucide-react';

export default function Login({ setActivePage, selectedCoachId }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Forgot Password modal state (Module 4)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: enter email, 2: enter otp & new pass
  const [forgotError, setForgotError] = useState(null);
  const [forgotSuccess, setForgotSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login(email, password);
      if (res.error) {
        setError(res.error);
      } else {
        login(res.user, res.token);
        if (res.user.role === 'admin') {
          setActivePage('admin-dashboard');
        } else if (res.user.role === 'coach') {
          setActivePage('coach-dashboard');
        } else {
          if (selectedCoachId) {
            setActivePage('payment');
          } else {
            setActivePage('customer-dashboard');
          }
        }
      }
    } catch (err) {
      setError('Failed to connect to the server. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
  };

  const handleSendResetCode = async (e) => {
    e.preventDefault();
    setForgotError(null);
    try {
      const res = await api.forgotPassword(forgotEmail);
      if (res.error) {
        setForgotError(res.error);
      } else {
        setForgotStep(2);
        setForgotSuccess('A verification code has been dispatched to your email. Please check your inbox and spam folder.');
      }
    } catch (err) {
      setForgotError('Failed to send reset code.');
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotError(null);
    try {
      const res = await api.resetPassword(forgotEmail, resetOtp, newPassword);
      if (res.error) {
        setForgotError(res.error);
      } else {
        setShowForgotModal(false);
        setPassword('');
        alert('Password has been reset successfully! You can now log in.');
      }
    } catch (err) {
      setForgotError('Failed to reset password.');
    }
  };

  return (
    <div className="section section-spacious">
      <div className="container">
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div className="card" style={{ padding: '3rem 2.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <span className="editorial-eyebrow">Module 4 &bull; Secure Authentication</span>
              <h1 style={{ fontSize: '2.2rem', fontWeight: '400', marginBottom: '0.4rem' }}>
                Account Login
              </h1>
              <p style={{ color: 'var(--color-muted-sage)', fontSize: '0.92rem' }}>
                Sign in to your consultation portal
              </p>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ margin: 0 }}>Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setShowForgotModal(true);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--color-logo-blue)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '1rem' }}
              >
                {loading ? 'Signing in...' : 'Sign In'} <span className="btn-arrow">&rarr;</span>
              </button>
            </form>

            <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--color-muted-sage)' }}>
              New customer?{' '}
              <span
                onClick={() => setActivePage('register')}
                style={{ color: 'var(--color-dark)', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Register here
              </span>
            </div>

            {/* Quick Demo Logins Helper */}
            <div style={{ marginTop: '2.5rem', paddingTop: '1.75rem', borderTop: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-muted-sage)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '1rem', textAlign: 'center' }}>
                Quick Demo Access
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleQuickLogin('customer@pvnutrition.com', 'Customer@123')}
                >
                  Customer Demo
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleQuickLogin('admin@pvnutrition.com', 'Admin@123')}
                >
                  Admin Demo
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleQuickLogin('palani@pvnutrition.com', 'Coach@123')}
                >
                  Coach Palani
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleQuickLogin('vijayashanthi@pvnutrition.com', 'Coach@123')}
                >
                  Coach Vijaya
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Forgot Password Modal (Module 4) */}
        {showForgotModal && (
          <div className="modal-overlay" onClick={() => setShowForgotModal(false)}>
            <div className="modal-container modal-card-animated" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.4rem', margin: 0 }}>Reset Password</h3>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowForgotModal(false)}>
                  <X size={18} />
                </button>
              </div>

              {forgotError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{forgotError}</div>}
              {forgotSuccess && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{forgotSuccess}</div>}

              {forgotStep === 1 ? (
                <form onSubmit={handleSendResetCode}>
                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label">Registered Email Address</label>
                    <input
                      type="email"
                      required
                      className="form-input"
                      placeholder="name@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-block" style={{ width: '100%' }}>
                    Send Verification Code &rarr;
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordSubmit}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">6-Digit Code</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      className="form-input"
                      placeholder="• • • • • •"
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">New Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      className="form-input"
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-block" style={{ width: '100%' }}>
                    Reset Password &amp; Login
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
