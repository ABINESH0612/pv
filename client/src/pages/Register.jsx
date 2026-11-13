import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, Phone, User, Calendar, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';

export default function Register({ setActivePage, selectedCoachId }) {
  const { login } = useAuth();

  // Step 1: Account fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState('');
  const [dob, setDob] = useState('');

  // Step 2: Real-time Email OTP verification state (Module 4)
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [registeredUser, setRegisteredUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  // Helper to mask email address for privacy (e.g., k***k@example.com)
  const maskEmail = (emailStr) => {
    if (!emailStr) return '';
    const parts = emailStr.split('@');
    if (parts.length !== 2) return emailStr;
    const [local, domain] = parts;
    const maskedLocal = local.length <= 2 
      ? local[0] + '***' 
      : local[0] + '***' + local[local.length - 1];
    return `${maskedLocal}@${domain}`;
  };

  // 60-second countdown timer for resend
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const res = await api.register({
        name,
        email,
        password,
        phone,
        gender,
        age: age ? Number(age) : null,
        dob
      });

      if (res.error) {
        setError(res.error);
      } else {
        setRegisteredUser(res.user);
        setAuthToken(res.token);
        setOtpSent(true);
        setResendCooldown(60); // 60s cooldown
        setInfo(`Verification code sent to ${maskEmail(email)}. Please check your inbox and spam folder.`);
      }
    } catch (err) {
      setError('Registration failed. Please check connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      localStorage.setItem('pv_token', authToken);
      const res = await api.verifyOtp(otpCode.trim());

      if (res.error) {
        setError(res.error);
      } else {
        login({ ...registeredUser, is_verified: true }, authToken);
        if (selectedCoachId) {
          setActivePage('payment');
        } else {
          setActivePage('health-assessment');
        }
      }
    } catch (err) {
      setError('OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setError(null);
    setInfo(null);
    setResending(true);

    try {
      localStorage.setItem('pv_token', authToken);
      const res = await api.resendOtp();
      if (res.error) {
        setError(res.error);
        if (res.retryAfter) {
          setResendCooldown(res.retryAfter);
        }
      } else {
        setResendCooldown(60);
        setInfo(`A new verification code has been dispatched to ${maskEmail(email)}. Please check your inbox.`);
      }
    } catch (e) {
      setError('Failed to resend verification code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="section section-spacious">
      <div className="container">
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <div className="card" style={{ padding: '3rem 2.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <span className="editorial-eyebrow">Module 4 &bull; Customer Registration</span>
              <h1 style={{ fontSize: '2.2rem', fontWeight: '400', marginBottom: '0.4rem' }}>
                {otpSent ? 'Verify Your Email' : 'Join PV Nutrition'}
              </h1>
              <p style={{ color: 'var(--color-muted-sage)', fontSize: '0.92rem' }}>
                {otpSent
                  ? `Enter the 6-digit code sent to ${maskEmail(email)}`
                  : 'Create an account to book consultations and receive coaching'}
              </p>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}
            {info && <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>{info}</div>}

            {!otpSent ? (
              // Step 1: Registration Form
              <form onSubmit={handleRegisterSubmit}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Karthik Raja"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address *</label>
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
                  <label className="form-label">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    className="form-input"
                    placeholder="e.g. 98401 23456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select className="form-input" value={gender} onChange={(e) => setGender(e.target.value)}>
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
                      placeholder="e.g. 29"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="form-input"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={loading}
                  style={{ width: '100%', marginTop: '0.75rem' }}
                >
                  {loading ? 'Sending verification code...' : 'Continue to Email Verification'} &rarr;
                </button>
              </form>
            ) : (
              // Step 2: OTP Verification Form (Module 4)
              <form onSubmit={handleVerifyOtpSubmit}>
                <div className="form-group" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                  <label className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>
                    Enter 6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    className="form-input"
                    placeholder="• • • • • •"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    style={{ textAlign: 'center', fontSize: '1.8rem', letterSpacing: '0.35em', fontWeight: '700', fontFamily: 'monospace' }}
                  />
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-muted-sage)', marginTop: '0.5rem' }}>
                    Code expires in 10 minutes. Check inbox & spam folder.
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={loading || otpCode.length < 6}
                  style={{ width: '100%', marginBottom: '1.25rem' }}
                >
                  {loading ? 'Verifying Code...' : 'Verify Code & Activate Account'} &rarr;
                </button>

                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || resending}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: resendCooldown > 0 ? 'var(--color-muted-sage)' : 'var(--color-logo-blue)',
                      cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                      fontSize: '0.88rem',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <RefreshCw size={14} className={resending ? 'spin' : ''} />
                    {resending 
                      ? 'Dispatching new code...'
                      : resendCooldown > 0 
                        ? `Resend code in ${resendCooldown}s` 
                        : "Didn't receive code? Resend Code"}
                  </button>
                </div>
              </form>
            )}

            <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
              <span style={{ color: 'var(--color-muted-sage)', fontSize: '0.9rem' }}>
                Already registered with PV Nutrition?{' '}
              </span>
              <button
                className="btn-link"
                onClick={() => setActivePage('login')}
                style={{ fontWeight: '600', color: 'var(--color-dark)' }}
              >
                Log In Here
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
