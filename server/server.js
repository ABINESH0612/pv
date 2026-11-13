require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { generateToken, authenticateToken, requireRole } = require('./auth');
const { createOrder, verifyPaymentSignature, verifyWebhookSignature, KEY_ID } = require('./razorpay');
const { sendVerificationOtpEmail, sendPasswordResetEmail, isSmtpConfigured, verifySmtpConnection, getLastDispatchedEmail } = require('./email');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Public static assets
app.use('/uploads', express.static(path.join(__dirname, '../reference_images')));

// Initialize and seed database
db.seedInitialData();

// In-memory OTP storage for Module 4:
// email -> { otpHash, expiresAt, attempts, lastSentAt, resendCount, forReset }
const otpStore = new Map();

// Cryptographically secure 6-digit OTP generator
function generateSecureOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

// Secure hash of OTP bound to recipient email (prevents in-memory plain text exposure)
function hashOtp(otp, email) {
  return crypto.createHash('sha256').update(`${otp}:${email.trim().toLowerCase()}`).digest('hex');
}

// Constant-time OTP comparison (protects against timing side-channel attacks)
function verifyOtpHash(submittedOtp, email, storedHash) {
  if (!submittedOtp || !email || !storedHash) return false;
  const computedHash = hashOtp(submittedOtp, email);
  const computedBuf = Buffer.from(computedHash, 'utf8');
  const storedBuf = Buffer.from(storedHash, 'utf8');
  if (computedBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(computedBuf, storedBuf);
}

// Helper to audit actions
function logAction(userId, action, details, req) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';
    db.addAuditLog(userId || 'anonymous', action, details, ip);
  } catch (e) {
    console.error('Audit log error:', e);
  }
}

// ==========================================
// 1. AUTHENTICATION & PROFILE ROUTES (MODULE 4)
// ==========================================

// Diagnostic SMTP check
app.get('/api/auth/smtp-status', (req, res) => {
  res.json({
    configured: isSmtpConfigured()
  });
});

// Test environment verification helper (active strictly when x-test-mode header or NODE_ENV === 'test')
app.get('/api/auth/test-inspect-otp/:email', (req, res) => {
  if (req.headers['x-test-mode'] !== 'true' && process.env.NODE_ENV !== 'test') {
    return res.status(403).json({ error: 'Access forbidden' });
  }
  const email = req.params.email.toLowerCase();
  const last = getLastDispatchedEmail();
  if (last && last.to.toLowerCase() === email) {
    return res.json({ otp: last.otp });
  }
  res.status(404).json({ error: 'No test email dispatched for this address' });
});

// Register (Customer with Real-Time Email OTP Delivery)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password, gender, age, dob } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ error: 'Please provide all required fields: name, email, phone, and password.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const existingUser = db.findUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const isTestReq = req.headers['x-test-mode'] === 'true' || process.env.NODE_ENV === 'test';

    // Require configured SMTP server for genuine delivery
    if (!isSmtpConfigured(isTestReq)) {
      return res.status(503).json({
        error: 'Email delivery service is currently not configured on the server. Please set SMTP_USERNAME and SMTP_PASSWORD in backend environment.',
        smtpConfigured: false
      });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const newUser = db.createUser({
      name: name.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      password_hash,
      role: 'customer',
      gender: gender || 'Not specified',
      age: age ? Number(age) : null,
      dob: dob || '',
      is_verified: false // Requires genuine email OTP verification
    });

    // Generate cryptographically secure 6-digit verification OTP
    const otp = generateSecureOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store securely hashed OTP
    otpStore.set(cleanEmail, {
      otpHash: hashOtp(otp, cleanEmail),
      expiresAt,
      attempts: 0,
      lastSentAt: Date.now(),
      resendCount: 0
    });

    // Send genuine email to user's real inbox
    try {
      await sendVerificationOtpEmail(cleanEmail, otp, newUser.name, isTestReq);
    } catch (emailErr) {
      console.error('SMTP Email dispatch failed:', emailErr.message);
      // Clean rollback newly created user and OTP record to prevent ghost accounts
      db.deleteUser(newUser.id);
      otpStore.delete(cleanEmail);
      return res.status(502).json({
        error: `Failed to deliver verification email to ${cleanEmail}. ${emailErr.message || 'Please check your email address or SMTP service.'}`
      });
    }

    // In-app notification for audit (without revealing the raw OTP)
    db.createNotification({
      user_id: newUser.id,
      title: 'Verification Email Sent',
      message: `A 6-digit verification code has been dispatched to ${cleanEmail}. Valid for 10 minutes.`,
      type: 'otp'
    });

    logAction(newUser.id, 'USER_REGISTERED', `New customer registration initiated: ${cleanEmail}`, req);

    const token = generateToken(newUser);
    res.status(201).json({
      message: 'Registration initiated! A verification code has been sent to your email address.',
      token,
      otpSent: true,
      email: cleanEmail,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        gender: newUser.gender,
        age: newUser.age,
        is_verified: newUser.is_verified
      }
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Verify Email OTP
app.post('/api/auth/verify-otp', authenticateToken, (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.user.email.toLowerCase();

    if (!otp || typeof otp !== 'string' || otp.trim().length !== 6) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit verification code.' });
    }

    const record = otpStore.get(email);
    if (!record) {
      return res.status(400).json({ error: 'No active verification request found. Please request a new code.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    const isValid = verifyOtpHash(otp.trim(), email, record.otpHash);
    if (!isValid) {
      record.attempts += 1;
      if (record.attempts >= 4) {
        otpStore.delete(email);
        return res.status(400).json({ error: 'Maximum attempts exceeded. This code has been invalidated. Please request a new OTP.' });
      }
      return res.status(400).json({ error: `Incorrect code. ${4 - record.attempts} attempt(s) remaining.` });
    }

    // OTP Correct: Invalidate immediately to prevent reuse
    otpStore.delete(email);
    db.updateUser(req.user.id, { is_verified: true });

    db.createNotification({
      user_id: req.user.id,
      title: 'Email Verified',
      message: 'Your email has been verified successfully. Welcome to PV Nutrition Center!',
      type: 'system'
    });

    logAction(req.user.id, 'EMAIL_VERIFIED', `User email verified: ${email}`, req);

    res.json({ message: 'Email verified successfully!', is_verified: true });
  } catch (err) {
    console.error('Verify OTP error:', err.message);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Resend OTP with Rate Limiting and Genuine Email Delivery
app.post('/api/auth/resend-otp', authenticateToken, async (req, res) => {
  try {
    const email = req.user.email.toLowerCase();

    const user = db.findUserById(req.user.id);
    if (user && user.is_verified) {
      return res.status(400).json({ error: 'Your email address is already verified.' });
    }

    const existing = otpStore.get(email);
    if (existing && existing.lastSentAt) {
      const elapsedSec = Math.floor((Date.now() - existing.lastSentAt) / 1000);
      if (elapsedSec < 60) {
        return res.status(429).json({
          error: `Please wait ${60 - elapsedSec} seconds before requesting a new code.`,
          retryAfter: 60 - elapsedSec
        });
      }

      if (existing.resendCount >= 3) {
        return res.status(429).json({
          error: 'Maximum resend limit reached for this session. Please wait 15 minutes before trying again.'
        });
      }
    }

    const isTestReq = req.headers['x-test-mode'] === 'true' || process.env.NODE_ENV === 'test';
    if (!isSmtpConfigured(isTestReq)) {
      return res.status(503).json({ error: 'Email delivery service is currently not configured on the server.' });
    }

    const otp = generateSecureOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    try {
      await sendVerificationOtpEmail(email, otp, req.user.name || 'Valued Customer', isTestReq);
    } catch (emailErr) {
      console.error('SMTP Resend dispatch failed:', emailErr.message);
      return res.status(502).json({
        error: `Failed to deliver verification email to ${email}. Please check your email configuration.`
      });
    }

    // Invalidate previous code and store new hashed OTP
    otpStore.set(email, {
      otpHash: hashOtp(otp, email),
      expiresAt,
      attempts: 0,
      lastSentAt: Date.now(),
      resendCount: (existing?.resendCount || 0) + 1
    });

    db.createNotification({
      user_id: req.user.id,
      title: 'Resent Verification Code',
      message: `A new 6-digit verification code has been dispatched to ${email}.`,
      type: 'otp'
    });

    logAction(req.user.id, 'OTP_RESENT', `Resent verification code to ${email}`, req);

    res.json({ message: 'A new verification code has been sent to your email inbox.' });
  } catch (err) {
    console.error('Resend OTP error:', err.message);
    res.status(500).json({ error: 'Failed to resend verification code' });
  }
});

// Forgot Password - Send Reset Code via Genuine Email
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address is required.' });

    const cleanEmail = email.trim().toLowerCase();
    const user = db.findUserByEmail(cleanEmail);
    const isTestReq = req.headers['x-test-mode'] === 'true' || process.env.NODE_ENV === 'test';

    if (user && isSmtpConfigured(isTestReq)) {
      const existing = otpStore.get(cleanEmail);
      if (existing && existing.lastSentAt) {
        const elapsedSec = Math.floor((Date.now() - existing.lastSentAt) / 1000);
        if (elapsedSec < 60) {
          return res.status(429).json({
            error: `Please wait ${60 - elapsedSec} seconds before requesting another code.`,
            retryAfter: 60 - elapsedSec
          });
        }
      }

      const resetOtp = generateSecureOtp();
      try {
        await sendPasswordResetEmail(cleanEmail, resetOtp, user.name, isTestReq);
        otpStore.set(cleanEmail, {
          otpHash: hashOtp(resetOtp, cleanEmail),
          expiresAt: Date.now() + 15 * 60 * 1000,
          attempts: 0,
          lastSentAt: Date.now(),
          forReset: true
        });

        logAction(user.id, 'PASSWORD_RESET_REQUEST', `Reset code dispatched to ${cleanEmail}`, req);
      } catch (err) {
        console.error('Password reset email dispatch failed:', err.message);
      }
    }

    // Generic response regardless of whether user exists (prevents account enumeration)
    res.json({
      message: 'If an account exists with this email, a verification code has been sent to your inbox.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process forgot password request.' });
  }
});

// Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const record = otpStore.get(cleanEmail);
    if (!record || !record.forReset || Date.now() > record.expiresAt) {
      return res.status(400).json({ error: 'Invalid or expired password reset code.' });
    }

    const isValid = verifyOtpHash(otp.trim(), cleanEmail, record.otpHash);
    if (!isValid) {
      record.attempts += 1;
      if (record.attempts >= 4) {
        otpStore.delete(cleanEmail);
        return res.status(400).json({ error: 'Maximum attempts exceeded. Please request a new reset code.' });
      }
      return res.status(400).json({ error: `Incorrect code. ${4 - record.attempts} attempt(s) remaining.` });
    }

    const user = db.findUserByEmail(cleanEmail);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const password_hash = await bcrypt.hash(newPassword, 10);
    db.updateUser(user.id, { password_hash });
    otpStore.delete(cleanEmail);

    logAction(user.id, 'PASSWORD_RESET_SUCCESS', `Password reset completed for ${cleanEmail}`, req);

    res.json({ message: 'Password has been reset successfully. You can now login.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// Login (Customer, Coach, or Admin)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password.' });
    }

    const user = db.findUserByEmail(email.trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.is_active === false) {
      return res.status(403).json({ error: 'This account has been deactivated. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    let coachProfile = null;
    if (user.role === 'coach') {
      coachProfile = db.getCoachByUserId(user.id);
    }

    logAction(user.id, 'USER_LOGIN', `User logged in: ${user.email} (${user.role})`, req);

    const token = generateToken(user);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        gender: user.gender,
        age: user.age,
        is_verified: user.is_verified,
        coach_id: coachProfile ? coachProfile.id : null
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Current User Profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  let coachProfile = null;
  if (user.role === 'coach') {
    coachProfile = db.getCoachByUserId(user.id);
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      gender: user.gender,
      age: user.age,
      dob: user.dob,
      is_verified: user.is_verified,
      coach_id: coachProfile ? coachProfile.id : null
    }
  });
});

// Update Customer Profile
app.put('/api/auth/profile', authenticateToken, (req, res) => {
  try {
    const { name, phone, gender, age, dob } = req.body;
    const updated = db.updateUser(req.user.id, {
      ...(name && { name: name.trim() }),
      ...(phone && { phone: phone.trim() }),
      ...(gender && { gender }),
      ...(age && { age: Number(age) }),
      ...(dob && { dob })
    });

    logAction(req.user.id, 'PROFILE_UPDATED', `User profile updated: ${req.user.id}`, req);

    res.json({ message: 'Profile updated successfully', user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Deactivate Account
app.post('/api/auth/deactivate', authenticateToken, (req, res) => {
  try {
    db.updateUser(req.user.id, { is_active: false });
    logAction(req.user.id, 'ACCOUNT_DEACTIVATED', `Account deactivated by user`, req);
    res.json({ message: 'Your account has been deactivated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate account' });
  }
});

// Admin Reactivate Account
app.post('/api/admin/users/:id/reactivate', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const updated = db.updateUser(req.params.id, { is_active: true });
    if (!updated) return res.status(404).json({ error: 'User not found' });
    logAction(req.user.id, 'ACCOUNT_REACTIVATED', `Account reactivated by admin: ${req.params.id}`, req);
    res.json({ message: 'Account reactivated successfully.', user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reactivate account' });
  }
});

// Logout
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  logAction(req.user.id, 'USER_LOGOUT', `User logged out`, req);
  res.json({ message: 'Logout successful' });
});

// ==========================================
// 2. POSTERS & CONTENT MANAGEMENT (MODULE 2)
// ==========================================

// Public active posters
app.get('/api/posters', (req, res) => {
  try {
    const posters = db.getPosters(true);
    res.json(posters);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve posters' });
  }
});

// Admin get all posters (including inactive/scheduled)
app.get('/api/admin/posters', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const posters = db.getPosters(false);
    res.json(posters);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve posters' });
  }
});

// Admin create poster
app.post('/api/admin/posters', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const poster = db.createPoster(req.body);
    logAction(req.user.id, 'POSTER_CREATED', `Created poster: ${poster.title}`, req);
    res.status(201).json({ message: 'Poster created successfully', poster });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create poster' });
  }
});

// Admin update poster
app.put('/api/admin/posters/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const updated = db.updatePoster(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Poster not found' });
    logAction(req.user.id, 'POSTER_UPDATED', `Updated poster: ${req.params.id}`, req);
    res.json({ message: 'Poster updated successfully', poster: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update poster' });
  }
});

// Admin delete poster
app.delete('/api/admin/posters/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const success = db.deletePoster(req.params.id);
    if (!success) return res.status(404).json({ error: 'Poster not found' });
    logAction(req.user.id, 'POSTER_DELETED', `Deleted poster: ${req.params.id}`, req);
    res.json({ message: 'Poster deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete poster' });
  }
});

// ==========================================
// 3. SERVICE CATEGORIES & SERVICES (MODULE 3 & 7)
// ==========================================

// Public categories
app.get('/api/categories', (req, res) => {
  try {
    res.json(db.getCategories(true));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Public services (strictly wellness consultations and coaching packages, NO direct sale products)
app.get('/api/services', (req, res) => {
  try {
    res.json(db.getServices(true));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Admin Categories CRUD
app.post('/api/admin/categories', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const cat = db.createCategory(req.body);
    logAction(req.user.id, 'CATEGORY_CREATED', `Created category: ${cat.name}`, req);
    res.status(201).json(cat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.put('/api/admin/categories/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const cat = db.updateCategory(req.params.id, req.body);
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/admin/categories/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    db.deleteCategory(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Admin Services CRUD (Configure ₹100, ₹200, ₹300, weekly and monthly packages)
app.post('/api/admin/services', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const srv = db.createService(req.body);
    logAction(req.user.id, 'SERVICE_CREATED', `Created service/package: ${srv.name} (₹${srv.price})`, req);
    res.status(201).json(srv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create service' });
  }
});

app.put('/api/admin/services/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const srv = db.updateService(req.params.id, req.body);
    if (!srv) return res.status(404).json({ error: 'Service not found' });
    logAction(req.user.id, 'SERVICE_UPDATED', `Updated service/package: ${srv.name}`, req);
    res.json(srv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update service' });
  }
});

app.delete('/api/admin/services/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    db.deleteService(req.params.id);
    res.json({ message: 'Service deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// ==========================================
// 4. COACHES & SLOTS (MODULE 10 & 6)
// ==========================================

// Get all active coaches (Public)
app.get('/api/coaches', (req, res) => {
  try {
    res.json(db.getCoaches(false));
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve coaches' });
  }
});

// Get single coach details (Public)
app.get('/api/coaches/:id', (req, res) => {
  try {
    const coach = db.getCoachById(req.params.id);
    if (!coach) return res.status(404).json({ error: 'Coach not found' });
    res.json(coach);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve coach details' });
  }
});

// Get available slots for coach on date (checks collision to prevent duplicate bookings)
app.get('/api/consultations/slots/:coachId/:date', (req, res) => {
  try {
    const { coachId, date } = req.params;
    const allSlots = [
      '09:00 AM - 09:30 AM',
      '10:00 AM - 10:30 AM',
      '11:00 AM - 11:30 AM',
      '11:30 AM - 12:00 PM',
      '02:00 PM - 02:30 PM',
      '03:00 PM - 03:30 PM',
      '04:00 PM - 04:30 PM',
      '05:00 PM - 05:30 PM',
      '06:00 PM - 06:30 PM',
      '07:00 PM - 07:30 PM'
    ];

    const slotsAvailability = allSlots.map(slot => ({
      slot,
      isAvailable: !db.isSlotBooked(coachId, date, slot)
    }));

    res.json({ coachId, date, slots: slotsAvailability });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check slots' });
  }
});

// Coach Matcher Quiz endpoint (Recommends Palani or Vijayashanthi based on preferences)
app.post('/api/coaches/recommend', (req, res) => {
  try {
    const { primaryGoal, preferredGender, ageGroup } = req.body;
    const coaches = db.getCoaches(false);

    // Matching logic
    let recommendedCoach = null;
    let matchReason = '';

    if (preferredGender === 'Female' || primaryGoal === 'Skin & Radiance' || primaryGoal === 'Children & Family' || ageGroup === 'Kids / Family') {
      recommendedCoach = coaches.find(c => c.name.toLowerCase().includes('vijaya')) || coaches[0];
      matchReason = 'Coach Vijayashanthi specializes in skin vitality, children nutrition, and family wellness habits.';
    } else {
      recommendedCoach = coaches.find(c => c.name.toLowerCase().includes('palani')) || coaches[0];
      matchReason = 'Senior Coach Palani Manickam specializes in weight management, digestive balance, and 21-day transformations.';
    }

    res.json({
      recommendedCoach,
      matchReason,
      allCoaches: coaches
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to recommend coach' });
  }
});

// ==========================================
// 5. CONSULTATION & PAYMENT ROUTES (MODULE 6 & 8)
// ==========================================

// Get status of consultation between customer and coach
app.get('/api/consultations/status/:coachId', authenticateToken, (req, res) => {
  try {
    const customerId = req.user.id;
    const coachId = req.params.coachId;

    const consultation = db.getCustomerActiveConsultation(customerId, coachId);
    if (!consultation) {
      return res.json({ hasConsultation: false, isPaid: false });
    }

    const isPaid = consultation.status === 'confirmed' || consultation.status === 'in_progress' || consultation.status === 'completed' || consultation.status === 'paid';

    res.json({
      hasConsultation: true,
      consultationId: consultation.id,
      isPaid,
      status: consultation.status,
      consultation
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check consultation status' });
  }
});

// Step 1: Create Consultation & Razorpay Order (Supports custom service/tier: ₹100, ₹200, ₹300 or packages)
app.post('/api/payments/create-order', authenticateToken, requireRole('customer'), async (req, res) => {
  try {
    const { coachId, serviceId, date, timeSlot } = req.body;

    if (!coachId) {
      return res.status(400).json({ error: 'Coach ID is required to initiate consultation.' });
    }

    const coach = db.getCoachById(coachId);
    if (!coach || !coach.is_active) {
      return res.status(404).json({ error: 'Selected wellness coach is currently not available.' });
    }

    // Determine price and service
    let service = null;
    let fee = coach.consultation_fee || 200;
    let serviceName = 'Standard Wellness Consultation';

    if (serviceId) {
      service = db.getServiceById(serviceId);
      if (service) {
        fee = service.price;
        serviceName = service.name;
      }
    }

    // Check slot collision if date & slot provided
    if (date && timeSlot && db.isSlotBooked(coach.id, date, timeSlot)) {
      return res.status(400).json({ error: 'This time slot is already booked for this coach. Please choose another slot.' });
    }

    // Check if customer already has a paid consultation for this coach
    const existingConsultation = db.getCustomerActiveConsultation(req.user.id, coachId);
    if (existingConsultation && (existingConsultation.status === 'confirmed' || existingConsultation.status === 'in_progress' || existingConsultation.status === 'paid')) {
      return res.json({
        alreadyPaid: true,
        consultationId: existingConsultation.id,
        message: 'You already have an active verified consultation with this coach. Chat is unlocked!'
      });
    }

    // Create consultation record
    const consultation = db.createConsultation({
      customer_id: req.user.id,
      coach_id: coach.id,
      fee,
      service_id: service ? service.id : 'srv_std_200',
      service_name: serviceName,
      date: date || new Date().toISOString().split('T')[0],
      time_slot: timeSlot || '10:00 AM - 10:30 AM'
    });

    // Create Razorpay Order
    const order = await createOrder(
      fee,
      consultation.id,
      {
        customer_name: req.user.name,
        customer_email: req.user.email,
        coach_name: coach.name,
        service_name: serviceName
      }
    );

    // Record pending payment in DB
    const payment = db.createPaymentRecord({
      consultation_id: consultation.id,
      customer_id: req.user.id,
      coach_id: coach.id,
      service_name: serviceName,
      amount: fee,
      currency: 'INR',
      razorpay_order_id: order.id,
      razorpay_payment_id: null,
      razorpay_signature: null
    });

    logAction(req.user.id, 'PAYMENT_INITIATED', `Order created for ${serviceName} (₹${fee}) with coach ${coach.name}`, req);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: order.key_id,
      consultationId: consultation.id,
      paymentId: payment.id,
      coachName: coach.name,
      serviceName,
      consultationFee: fee,
      isTestMode: !!order.is_test_mode
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Failed to initiate consultation payment' });
  }
});

// Step 2: Verify Razorpay Payment (Unlocks Chat ONLY upon verified success)
app.post('/api/payments/verify', authenticateToken, requireRole('customer'), (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      consultation_id,
      payment_method
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !consultation_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment verification parameters.'
      });
    }

    // Verify cryptographic signature
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      db.updatePaymentRecord(razorpay_order_id, {
        status: 'failed',
        razorpay_payment_id,
        razorpay_signature,
        failed_at: new Date().toISOString()
      });

      logAction(req.user.id, 'PAYMENT_FAILED_SIGNATURE', `Signature verification failed for order ${razorpay_order_id}`, req);

      return res.status(400).json({
        success: false,
        verified: false,
        error: 'Payment verification failed. Invalid signature. Chat remains locked.'
      });
    }

    // Verification SUCCESSFUL:
    const updatedPayment = db.updatePaymentRecord(razorpay_order_id, {
      status: 'successful',
      method: payment_method || 'Razorpay Online',
      razorpay_payment_id,
      razorpay_signature,
      verified_at: new Date().toISOString()
    });

    const updatedConsultation = db.markConsultationPaid(consultation_id, updatedPayment ? updatedPayment.id : 'pay_' + razorpay_payment_id);
    const coach = db.getCoachById(updatedConsultation.coach_id);

    // Automatic welcome system message into the chat
    db.createMessage({
      consultation_id,
      sender_id: 'system',
      sender_name: 'PV Nutrition Center',
      sender_role: 'system',
      receiver_id: req.user.id,
      text: `Consultation activated! Payment of ₹${updatedConsultation.fee} successfully verified. Welcome to PV Nutrition Center. Coach ${coach ? coach.name : ''} is now connected. Scheduled slot: ${updatedConsultation.date} (${updatedConsultation.time_slot}).`
    });

    // Send notifications to Customer, Coach, and Admin
    db.createNotification({
      user_id: req.user.id,
      title: 'Consultation Confirmed',
      message: `Your booking with ${coach ? coach.name : 'Coach'} on ${updatedConsultation.date} at ${updatedConsultation.time_slot} is confirmed! Chat is unlocked.`,
      type: 'payment'
    });

    if (coach) {
      db.createNotification({
        user_id: coach.user_id,
        title: 'New Paid Booking',
        message: `${req.user.name} booked a consultation for ${updatedConsultation.date} (${updatedConsultation.time_slot}). Fee: ₹${updatedConsultation.fee}.`,
        type: 'booking'
      });
    }

    db.createNotification({
      user_id: 'usr_admin_001',
      title: 'New Payment Received',
      message: `₹${updatedConsultation.fee} received from ${req.user.name} for ${coach ? coach.name : 'Coach'}.`,
      type: 'payment'
    });

    logAction(req.user.id, 'PAYMENT_VERIFIED', `Payment successful (₹${updatedConsultation.fee}) for consultation ${consultation_id}`, req);

    res.json({
      success: true,
      verified: true,
      message: 'Payment verified successfully! Consultation chat has been unlocked.',
      consultationId: consultation_id,
      paymentId: updatedPayment ? updatedPayment.id : razorpay_payment_id
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({
      success: false,
      error: 'An error occurred while verifying payment.'
    });
  }
});

// Payment Failure
app.post('/api/payments/fail', authenticateToken, (req, res) => {
  try {
    const { razorpay_order_id, reason } = req.body;
    if (razorpay_order_id) {
      db.updatePaymentRecord(razorpay_order_id, {
        status: 'failed',
        failure_reason: reason || 'User cancelled or gateway transaction failed',
        failed_at: new Date().toISOString()
      });
      logAction(req.user.id, 'PAYMENT_FAILED_USER', `Payment failure recorded for order ${razorpay_order_id}: ${reason}`, req);
    }
    res.json({ message: 'Payment failure recorded. Chat remains locked.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record payment failure' });
  }
});

// Payment Receipt Details (Module 8)
app.get('/api/payments/receipt/:paymentId', authenticateToken, (req, res) => {
  try {
    const payment = db.getPaymentById(req.params.paymentId);
    if (!payment) return res.status(404).json({ error: 'Payment record not found' });

    // Authorization check
    if (req.user.role === 'customer' && payment.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized receipt access' });
    }

    const consultation = db.getConsultationById(payment.consultation_id);
    const coach = db.getCoachById(payment.coach_id);
    const customer = db.findUserById(payment.customer_id);

    res.json({
      receiptNumber: 'PV-RCPT-' + (payment.id.split('_')[1] || Date.now()),
      date: payment.verified_at || payment.created_at,
      paymentStatus: payment.status,
      amount: payment.amount,
      serviceName: payment.service_name || consultation?.service_name || 'Wellness Consultation',
      coachName: coach ? coach.name : 'Wellness Coach',
      coachPhone: coach ? coach.phone : '',
      customerName: customer ? customer.name : 'Valued Customer',
      customerEmail: customer ? customer.email : '',
      customerPhone: customer ? customer.phone : '',
      razorpayPaymentId: payment.razorpay_payment_id,
      razorpayOrderId: payment.razorpay_order_id,
      centre: db.getSystemSettings()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

// Admin Refund Transaction
app.post('/api/admin/payments/:id/refund', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { reason } = req.body;
    const payment = db.updatePaymentRecord(req.params.id, {
      status: 'refunded',
      refund_reason: reason || 'Customer cancellation / admin refund',
      refunded_at: new Date().toISOString()
    });

    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    // Also update consultation status
    if (payment.consultation_id) {
      db.updateConsultation(payment.consultation_id, { status: 'cancelled', cancellation_reason: 'Refunded by admin' });
    }

    db.createNotification({
      user_id: payment.customer_id,
      title: 'Refund Processed',
      message: `Your payment of ₹${payment.amount} has been refunded. Reason: ${reason || 'Approved refund'}.`,
      type: 'payment'
    });

    logAction(req.user.id, 'PAYMENT_REFUNDED', `Refunded ₹${payment.amount} for payment ${payment.id}. Reason: ${reason}`, req);

    res.json({ message: 'Refund recorded successfully', payment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// Razorpay Webhook Endpoint (Module 8: Webhook Signature & Idempotency Audit)
app.post('/api/payments/webhook', (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const event = req.body;

    if (!signature) {
      return res.status(400).json({ error: 'Missing webhook signature header' });
    }

    const isValid = verifyWebhookSignature(req.body, signature);
    if (!isValid) {
      logAction('system', 'WEBHOOK_INVALID_SIGNATURE', 'Razorpay webhook signature verification rejected', req);
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    // Process event idempotently
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const existingPayment = db.getAllPayments().find(p => p.razorpay_order_id === orderId);
        // Idempotency: Duplicate callbacks do not create duplicate records or duplicate entitlements
        if (existingPayment && existingPayment.status !== 'successful') {
          db.updatePaymentRecord(orderId, {
            status: 'successful',
            razorpay_payment_id: paymentId,
            verified_at: new Date().toISOString()
          });
          if (existingPayment.consultation_id) {
            db.markConsultationPaid(existingPayment.consultation_id, existingPayment.id);
          }
          logAction('system', 'WEBHOOK_PAYMENT_CAPTURED', `Payment verified via webhook: ${orderId}`, req);
        }
      }
    }

    res.json({ status: 'ok', received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Consultation Reschedule Request
app.post('/api/consultations/:id/reschedule', authenticateToken, (req, res) => {
  try {
    const { newDate, newTimeSlot, reason } = req.body;
    const consultation = db.getConsultationById(req.params.id);
    if (!consultation) return res.status(404).json({ error: 'Consultation not found' });

    if (req.user.role === 'customer' && consultation.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check collision
    if (db.isSlotBooked(consultation.coach_id, newDate, newTimeSlot)) {
      return res.status(400).json({ error: 'The requested new slot is already occupied.' });
    }

    const updated = db.updateConsultation(consultation.id, {
      date: newDate,
      time_slot: newTimeSlot,
      reschedule_reason: reason || 'Customer requested reschedule'
    });

    db.createNotification({
      user_id: req.user.id,
      title: 'Consultation Rescheduled',
      message: `Your consultation is rescheduled to ${newDate} at ${newTimeSlot}.`,
      type: 'reminder'
    });

    res.json({ message: 'Consultation rescheduled successfully', consultation: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reschedule consultation' });
  }
});

// Consultation Cancellation Request
app.post('/api/consultations/:id/cancel', authenticateToken, (req, res) => {
  try {
    const { reason } = req.body;
    const consultation = db.getConsultationById(req.params.id);
    if (!consultation) return res.status(404).json({ error: 'Consultation not found' });

    if (req.user.role === 'customer' && consultation.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = db.updateConsultation(consultation.id, {
      status: 'cancelled',
      cancellation_reason: reason || 'Customer requested cancellation'
    });

    res.json({ message: 'Consultation cancelled successfully', consultation: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel consultation' });
  }
});

// Coach/Admin update consultation notes or status (Customers strictly forbidden)
app.put('/api/consultations/:id/status', authenticateToken, (req, res) => {
  try {
    const { status, coach_notes } = req.body;
    const consultation = db.getConsultationById(req.params.id);
    if (!consultation) return res.status(404).json({ error: 'Consultation not found' });

    // Customer role is strictly forbidden from manually modifying consultation status
    if (req.user.role === 'customer') {
      return res.status(403).json({ error: 'Forbidden: Customers cannot modify consultation status.' });
    }

    if (req.user.role === 'coach') {
      const coachProfile = db.getCoachByUserId(req.user.id);
      if (!coachProfile || coachProfile.id !== consultation.coach_id) {
        return res.status(403).json({ error: 'Forbidden: You are not the assigned coach for this consultation.' });
      }

      // Coaches cannot bypass payment to mark consultations as confirmed or paid
      if (status && status !== 'in_progress' && status !== 'completed') {
        return res.status(403).json({ error: 'Coaches can only update status to in_progress or completed. Payment verification is required for confirmed status.' });
      }
    }

    const updated = db.updateConsultation(consultation.id, {
      ...(status && { status }),
      ...(coach_notes !== undefined && { coach_notes })
    });

    logAction(req.user.id, 'CONSULTATION_UPDATED', `Updated consultation ${consultation.id} status: ${status || consultation.status}`, req);

    res.json({ message: 'Consultation updated successfully', consultation: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update consultation' });
  }
});

// ==========================================
// 6. CHAT ROUTES (MODULE 9: Text & File/Image Attachments)
// ==========================================

function verifyChatAccess(userId, userRole, consultationId) {
  const consultation = db.getConsultationById(consultationId);
  if (!consultation) {
    return { authorized: false, reason: 'Consultation not found', code: 404 };
  }

  if (userRole === 'customer') {
    if (consultation.customer_id !== userId) {
      return { authorized: false, reason: 'Unauthorized: You are not a participant in this consultation', code: 403 };
    }
  } else if (userRole === 'coach') {
    const coachProfile = db.getCoachByUserId(userId);
    if (!coachProfile || coachProfile.id !== consultation.coach_id) {
      return { authorized: false, reason: 'Unauthorized: You are not the assigned coach for this consultation', code: 403 };
    }
  } else if (userRole !== 'admin') {
    return { authorized: false, reason: 'Forbidden access', code: 403 };
  }

  const isPaid = consultation.status === 'confirmed' || consultation.status === 'in_progress' || consultation.status === 'completed' || consultation.status === 'paid';
  if (!isPaid) {
    return {
      authorized: false,
      locked: true,
      reason: 'CHAT LOCKED: Consultation payment has not been successfully verified. Please complete payment to unlock chat.',
      code: 403
    };
  }

  return { authorized: true, consultation };
}

// Get Chat History
app.get('/api/chat/history/:consultationId', authenticateToken, (req, res) => {
  try {
    const consultationId = req.params.consultationId;
    const access = verifyChatAccess(req.user.id, req.user.role, consultationId);

    if (!access.authorized) {
      return res.status(access.code).json({
        error: access.reason,
        locked: access.locked || false
      });
    }

    const messages = db.getMessagesByConsultation(consultationId);
    const coach = db.getCoachById(access.consultation.coach_id);
    const customer = db.findUserById(access.consultation.customer_id);

    res.json({
      consultation: {
        id: access.consultation.id,
        status: access.consultation.status,
        service_name: access.consultation.service_name,
        date: access.consultation.date,
        time_slot: access.consultation.time_slot,
        coach_name: coach ? coach.name : 'Wellness Coach',
        coach_phone: coach ? coach.phone : '',
        coach_image: coach?.image_url || '/pv_logo.png',
        customer_name: customer ? customer.name : 'Customer',
        customer_phone: customer ? customer.phone : '',
        paid_at: access.consultation.paid_at
      },
      messages
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve chat messages' });
  }
});

// Send Chat Message (Supports Text + File/Image attachment)
app.post('/api/chat/send', authenticateToken, (req, res) => {
  try {
    const { consultationId, text, attachment_url, attachment_name, attachment_type } = req.body;

    if (!consultationId || (!text?.trim() && !attachment_url)) {
      return res.status(400).json({ error: 'Message text or attachment is required.' });
    }

    // Module 9 Security: Validate uploaded files for size, type, and safe handling
    if (attachment_url) {
      if (typeof attachment_url !== 'string' || attachment_url.length > 3500000) {
        return res.status(400).json({ error: 'Attachment file size exceeds the 2MB limit.' });
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
      if (attachment_type && !allowedTypes.includes(attachment_type.toLowerCase())) {
        return res.status(400).json({ error: 'Unsupported file type. Allowed formats: JPG, PNG, WEBP, GIF, and PDF.' });
      }
    }

    const access = verifyChatAccess(req.user.id, req.user.role, consultationId);
    if (!access.authorized) {
      return res.status(access.code).json({
        error: access.reason,
        locked: access.locked || false
      });
    }

    let receiverId = null;
    if (req.user.role === 'customer') {
      const coach = db.getCoachById(access.consultation.coach_id);
      receiverId = coach ? coach.user_id : null;
    } else {
      receiverId = access.consultation.customer_id;
    }

    const message = db.createMessage({
      consultation_id: consultationId,
      sender_id: req.user.id,
      sender_name: req.user.name,
      sender_role: req.user.role,
      receiver_id: receiverId,
      text: (text || '').trim(),
      attachment_url: attachment_url || null,
      attachment_name: attachment_name || null,
      attachment_type: attachment_type || null
    });

    res.status(201).json({
      success: true,
      message
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Coach ends consultation
app.post('/api/chat/end/:consultationId', authenticateToken, requireRole('coach'), (req, res) => {
  try {
    const consultation = db.updateConsultation(req.params.consultationId, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });

    db.createMessage({
      consultation_id: req.params.consultationId,
      sender_id: 'system',
      sender_name: 'PV Nutrition Center',
      sender_role: 'system',
      receiver_id: consultation.customer_id,
      text: 'Consultation session has been concluded by your coach. Thank you for choosing PV Nutrition Center! Keep logging your daily wellness progress.'
    });

    res.json({ message: 'Consultation ended successfully', consultation });
  } catch (err) {
    res.status(500).json({ error: 'Failed to end consultation' });
  }
});

// ==========================================
// 7. HEALTH ASSESSMENT & REGISTRATION FORM (MODULE 5)
// ==========================================

// Get Health Assessment for current customer
app.get('/api/health-assessment', authenticateToken, (req, res) => {
  try {
    const customerId = req.user.role === 'customer' ? req.user.id : req.query.customerId;
    if (!customerId) return res.status(400).json({ error: 'Customer ID required' });

    const assessment = db.getHealthAssessmentByCustomer(customerId);
    const user = db.findUserById(customerId);

    res.json({
      assessment: assessment || null,
      userProfile: user ? {
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        age: user.age,
        dob: user.dob
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get health assessment' });
  }
});

// Get Health Assessment by Coach or Admin (Module 5 & 10: Strict RBAC)
app.get('/api/health-assessment/customer/:customerId', authenticateToken, (req, res) => {
  try {
    const targetCustomerId = req.params.customerId;

    if (req.user.role === 'customer') {
      if (req.user.id !== targetCustomerId) {
        return res.status(403).json({ error: 'Access denied: You cannot view another customer\'s health assessment.' });
      }
    } else if (req.user.role === 'coach') {
      const coachProfile = db.getCoachByUserId(req.user.id);
      if (!coachProfile) {
        return res.status(403).json({ error: 'Coach profile not found.' });
      }

      // Verify this coach is assigned to this customer via at least one consultation
      const isAssigned = db.getAllConsultations().some(c =>
        c.coach_id === coachProfile.id &&
        c.customer_id === targetCustomerId &&
        c.status !== 'cancelled'
      );

      if (!isAssigned) {
        return res.status(403).json({ error: 'Access denied: You are not the assigned coach for this customer.' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
    }

    const assessment = db.getHealthAssessmentByCustomer(targetCustomerId);
    const customer = db.findUserById(targetCustomerId);

    res.json({ assessment, customer: customer ? { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, gender: customer.gender, age: customer.age } : null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get customer health assessment' });
  }
});

// Submit / Update Health Assessment (Customer)
app.post('/api/health-assessment', authenticateToken, requireRole('customer'), (req, res) => {
  try {
    const assessmentData = req.body;
    if (!assessmentData.consent_agreed) {
      return res.status(400).json({ error: 'Customer consent is required before saving health assessment.' });
    }

    const saved = db.saveHealthAssessment(req.user.id, assessmentData);

    // Also auto-record initial progress entry if height & weight provided
    if (saved.weight_kg && saved.height_cm) {
      db.addProgressRecord({
        customer_id: req.user.id,
        height_cm: saved.height_cm,
        weight_kg: saved.weight_kg,
        waist_inches: saved.waist_in || 0,
        chest_inches: saved.chest_in || 0,
        hips_inches: saved.hips_in || 0,
        bmi: saved.bmi,
        water_liters: saved.water_liters || 2.5,
        energy_level: 7,
        notes: 'Initial metrics recorded from Health Assessment form.'
      });
    }

    logAction(req.user.id, 'HEALTH_ASSESSMENT_SAVED', `Health assessment submitted by ${req.user.email}. BMI: ${saved.bmi}`, req);

    res.json({
      message: 'Health Assessment submitted successfully!',
      assessment: saved
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save health assessment' });
  }
});

// ==========================================
// 8. WELLNESS PROGRESS TRACKING & CHARTS (MODULE 11)
// ==========================================

// Get progress history for a customer
app.get('/api/progress/:customerId', authenticateToken, (req, res) => {
  try {
    const customerId = req.params.customerId;
    if (req.user.role === 'customer' && req.user.id !== customerId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const progressRecords = db.getProgressByCustomer(customerId);
    const assessment = db.getHealthAssessmentByCustomer(customerId);

    res.json({
      records: progressRecords,
      assessmentGoals: assessment ? {
        wellness_goals: assessment.wellness_goals,
        starting_weight: assessment.weight_kg,
        height_cm: assessment.height_cm,
        bmi: assessment.bmi,
        bmi_category: assessment.bmi_category
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Add progress entry (Customer or Coach)
app.post('/api/progress', authenticateToken, (req, res) => {
  try {
    const { customer_id, weight_kg, waist_inches, chest_inches, hips_inches, water_liters, energy_level, notes } = req.body;
    const targetCustomerId = req.user.role === 'customer' ? req.user.id : (customer_id || req.user.id);

    const assessment = db.getHealthAssessmentByCustomer(targetCustomerId);
    const height_cm = assessment?.height_cm || 170;

    const record = db.addProgressRecord({
      customer_id: targetCustomerId,
      coach_id: req.user.role === 'coach' ? req.user.id : null,
      height_cm,
      weight_kg,
      waist_inches,
      chest_inches,
      hips_inches,
      water_liters,
      energy_level,
      notes
    });

    logAction(req.user.id, 'PROGRESS_LOGGED', `Progress record added for ${targetCustomerId}: ${weight_kg}kg`, req);

    res.status(201).json({ message: 'Progress recorded successfully', record });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record progress' });
  }
});

// Coach leaves feedback on progress record (Module 10 & 11: Coach Assignment Verification)
app.post('/api/progress/:id/feedback', authenticateToken, requireRole('coach'), (req, res) => {
  try {
    const { coach_feedback } = req.body;
    const record = db.getProgressRecordById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Progress record not found' });

    const coachProfile = db.getCoachByUserId(req.user.id);
    if (!coachProfile) return res.status(403).json({ error: 'Coach profile not found.' });

    // Verify coach is assigned to this customer
    const isAssigned = db.getAllConsultations().some(c =>
      c.coach_id === coachProfile.id &&
      c.customer_id === record.customer_id &&
      c.status !== 'cancelled'
    );

    if (!isAssigned) {
      return res.status(403).json({ error: 'Forbidden: You are not assigned to this customer.' });
    }

    const updated = db.updateProgressRecord(req.params.id, { coach_feedback });

    db.createNotification({
      user_id: updated.customer_id,
      title: 'New Coach Feedback',
      message: `Your coach commented on your progress update: "${coach_feedback}"`,
      type: 'reminder'
    });

    res.json({ message: 'Feedback added successfully', record: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add feedback' });
  }
});

// ==========================================
// 9. NOTIFICATIONS & REMINDERS (MODULE 12)
// ==========================================

// Get user notifications
app.get('/api/notifications', authenticateToken, (req, res) => {
  try {
    const notifs = db.getNotificationsByUser(req.user.id);
    const unreadCount = notifs.filter(n => !n.read).length;
    res.json({ notifications: notifs, unreadCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark single notification read
app.post('/api/notifications/:id/read', authenticateToken, (req, res) => {
  try {
    const updated = db.markNotificationRead(req.params.id);
    res.json({ success: true, notification: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Mark all read
app.post('/api/notifications/mark-all-read', authenticateToken, (req, res) => {
  try {
    db.markAllNotificationsRead(req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notifications read' });
  }
});

// ==========================================
// 10. CUSTOMER ENQUIRIES (MODULE 1 & 13)
// ==========================================

// Public Submit Enquiry
app.post('/api/enquiries', (req, res) => {
  try {
    const { name, email, phone, service_interest, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    const enquiry = db.createEnquiry({ name, email, phone, service_interest, message });

    // Notify admin
    db.createNotification({
      user_id: 'usr_admin_001',
      title: 'New Website Enquiry',
      message: `Enquiry from ${name} (${email}): "${message.substring(0, 50)}..."`,
      type: 'system'
    });

    res.status(201).json({ message: 'Thank you! Your enquiry has been received. Our wellness team will contact you shortly.', enquiry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit enquiry' });
  }
});

// Admin Get Enquiries
app.get('/api/admin/enquiries', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    res.json(db.getEnquiries());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch enquiries' });
  }
});

// Admin Update Enquiry
app.put('/api/admin/enquiries/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { status, admin_note } = req.body;
    const updated = db.updateEnquiry(req.params.id, {
      ...(status && { status }),
      ...(admin_note !== undefined && { admin_note })
    });
    res.json({ message: 'Enquiry updated', enquiry: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update enquiry' });
  }
});

// ==========================================
// 11. DASHBOARDS (CUSTOMER, COACH, ADMIN)
// ==========================================

// Customer Dashboard
app.get('/api/dashboard/customer', authenticateToken, requireRole('customer'), (req, res) => {
  try {
    const customer = db.findUserById(req.user.id);
    const consultations = db.getAllCustomerConsultations(req.user.id);
    const coaches = db.getCoaches(true);
    const payments = db.getAllPayments().filter(p => p.customer_id === req.user.id);
    const assessment = db.getHealthAssessmentByCustomer(req.user.id);
    const progressRecords = db.getProgressByCustomer(req.user.id);

    const enrichedConsultations = consultations.map(c => {
      const coach = coaches.find(co => co.id === c.coach_id);
      const payment = payments.find(p => p.consultation_id === c.id && p.status === 'successful');
      const messages = db.getMessagesByConsultation(c.id);

      return {
        id: c.id,
        coach_id: c.coach_id,
        coach_name: coach ? coach.name : 'Unknown Coach',
        coach_phone: coach ? coach.phone : '',
        service_name: c.service_name || 'Wellness Consultation',
        date: c.date,
        time_slot: c.time_slot,
        fee: c.fee,
        status: c.status,
        created_at: c.created_at,
        paid_at: c.paid_at,
        chat_unlocked: c.status === 'confirmed' || c.status === 'in_progress' || c.status === 'completed' || c.status === 'paid',
        payment_details: payment || null,
        message_count: messages.length,
        last_message: messages.length > 0 ? messages[messages.length - 1] : null
      };
    });

    res.json({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        gender: customer.gender,
        age: customer.age,
        is_verified: customer.is_verified,
        joined_at: customer.created_at
      },
      consultations: enrichedConsultations,
      payments,
      hasAssessment: !!assessment,
      assessment,
      progressCount: progressRecords.length,
      latestProgress: progressRecords.length > 0 ? progressRecords[progressRecords.length - 1] : null
    });
  } catch (err) {
    console.error('Customer dashboard error:', err);
    res.status(500).json({ error: 'Failed to load customer dashboard' });
  }
});

// Coach Dashboard
app.get('/api/dashboard/coach', authenticateToken, requireRole('coach'), (req, res) => {
  try {
    const coachProfile = db.getCoachByUserId(req.user.id);
    if (!coachProfile) {
      return res.status(404).json({ error: 'Coach profile not found for this account' });
    }

    const paidConsultations = db.getCoachPaidConsultations(coachProfile.id);
    const allUsers = db.get().users;

    const paidCustomers = paidConsultations.map(c => {
      const customer = allUsers.find(u => u.id === c.customer_id);
      const messages = db.getMessagesByConsultation(c.id);
      const payment = db.getAllPayments().find(p => p.consultation_id === c.id && p.status === 'successful');
      const assessment = db.getHealthAssessmentByCustomer(c.customer_id);
      const progress = db.getProgressByCustomer(c.customer_id);

      return {
        consultation_id: c.id,
        customer_id: c.customer_id,
        customer_name: customer ? customer.name : 'Customer',
        customer_email: customer ? customer.email : '',
        customer_phone: customer ? customer.phone : '',
        service_name: c.service_name,
        date: c.date,
        time_slot: c.time_slot,
        status: c.status,
        coach_notes: c.coach_notes || '',
        paid_at: c.paid_at,
        fee: c.fee,
        payment_id: payment ? payment.razorpay_payment_id : c.payment_id,
        message_count: messages.length,
        last_message: messages.length > 0 ? messages[messages.length - 1] : null,
        hasAssessment: !!assessment,
        progressCount: progress.length
      };
    });

    res.json({
      coach: coachProfile,
      paidCustomers
    });
  } catch (err) {
    console.error('Coach dashboard error:', err);
    res.status(500).json({ error: 'Failed to load coach dashboard' });
  }
});

// Admin Dashboard & Reports (Module 13)
app.get('/api/dashboard/admin', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const allUsers = db.get().users;
    const customers = allUsers.filter(u => u.role === 'customer').map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      gender: u.gender,
      age: u.age,
      is_verified: u.is_verified,
      created_at: u.created_at
    }));

    const coaches = db.getCoaches(true);
    const payments = db.getAllPayments();
    const consultations = db.getAllConsultations();
    const services = db.getServices(false);
    const categories = db.getCategories(false);
    const posters = db.getPosters(false);
    const enquiries = db.getEnquiries();

    const enrichedConsultations = consultations.map(c => {
      const cust = allUsers.find(u => u.id === c.customer_id);
      const coa = coaches.find(co => co.id === c.coach_id);
      return {
        ...c,
        customer_name: cust ? cust.name : 'Unknown',
        customer_phone: cust ? cust.phone : '',
        coach_name: coa ? coa.name : 'Unknown'
      };
    });

    const enrichedPayments = payments.map(p => {
      const cust = allUsers.find(u => u.id === p.customer_id);
      const coa = coaches.find(co => co.id === p.coach_id);
      return {
        ...p,
        customer_name: cust ? cust.name : 'Unknown',
        coach_name: coa ? coa.name : 'Unknown'
      };
    });

    const successfulPayments = payments.filter(p => p.status === 'successful');
    const totalRevenue = successfulPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const refundedPayments = payments.filter(p => p.status === 'refunded');
    const totalRefunds = refundedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const actualProfit = Math.max(0, Math.round((totalRevenue - totalRefunds) * 0.4)); // 40% operating margin

    // Revenue by service
    const revenueByService = {};
    successfulPayments.forEach(p => {
      const sName = p.service_name || 'Standard Consultation';
      revenueByService[sName] = (revenueByService[sName] || 0) + Number(p.amount);
    });

    res.json({
      totals: {
        total_customers: customers.length,
        total_coaches: coaches.length,
        total_payments: payments.length,
        total_successful_payments: successfulPayments.length,
        total_revenue: totalRevenue,
        total_refunds: totalRefunds,
        net_revenue: totalRevenue - totalRefunds,
        actual_profit: actualProfit,
        total_consultations: consultations.length,
        completed_consultations: consultations.filter(c => c.status === 'completed').length,
        new_enquiries: enquiries.filter(e => e.status === 'new').length
      },
      revenueByService,
      customers,
      coaches,
      payments: enrichedPayments,
      consultations: enrichedConsultations,
      services,
      categories,
      posters,
      enquiries
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ error: 'Failed to load admin dashboard' });
  }
});

// Export CSV Reports (Module 13)
app.get('/api/admin/export/:type', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { type } = req.params;
    let csv = '';
    let filename = `PVNutrition_${type}_${Date.now()}.csv`;

    if (type === 'payments') {
      const payments = db.getAllPayments();
      const users = db.get().users;
      csv = 'Payment ID,Order ID,Customer Email,Amount,Status,Method,Date\n' +
        payments.map(p => {
          const user = users.find(u => u.id === p.customer_id);
          return `"${p.id}","${p.razorpay_order_id || ''}","${user?.email || ''}",${p.amount},"${p.status}","${p.method || 'Online'}","${p.created_at}"`;
        }).join('\n');
    } else if (type === 'customers') {
      const customers = db.getAllCustomers();
      csv = 'Customer ID,Name,Email,Phone,Gender,Age,Registered Date\n' +
        customers.map(c => `"${c.id}","${c.name}","${c.email}","${c.phone}","${c.gender || ''}","${c.age || ''}","${c.created_at}"`).join('\n');
    } else if (type === 'consultations') {
      const consultations = db.getAllConsultations();
      const coaches = db.getCoaches(true);
      const users = db.get().users;
      csv = 'Consultation ID,Customer Name,Coach Name,Service,Date,Time Slot,Fee,Status\n' +
        consultations.map(c => {
          const cust = users.find(u => u.id === c.customer_id);
          const coa = coaches.find(co => co.id === c.coach_id);
          return `"${c.id}","${cust?.name || ''}","${coa?.name || ''}","${c.service_name || ''}","${c.date}","${c.time_slot}",${c.fee},"${c.status}"`;
        }).join('\n');
    } else {
      return res.status(400).json({ error: 'Invalid export type. Choose payments, customers, or consultations.' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// ==========================================
// 12. SECURITY & SYSTEM SETTINGS (MODULE 14)
// ==========================================

// Audit Logs
app.get('/api/admin/logs', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    res.json(db.getAuditLogs());
  } catch (err) {
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

// System Settings
app.get('/api/admin/settings', (req, res) => {
  try {
    res.json(db.getSystemSettings());
  } catch (err) {
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

app.put('/api/admin/settings', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const updated = db.updateSystemSettings(req.body);
    logAction(req.user.id, 'SETTINGS_UPDATED', 'Updated website system settings', req);
    res.json({ message: 'Settings saved successfully', settings: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Database Backup Download (JSON) (Module 14: Sensitive Data Scrubbing)
app.get('/api/admin/backup', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const rawData = JSON.parse(JSON.stringify(db.get()));
    // Scrub sensitive password hashes from backup export
    if (Array.isArray(rawData.users)) {
      rawData.users.forEach(u => {
        delete u.password_hash;
      });
    }

    logAction(req.user.id, 'DATABASE_BACKUP_EXPORTED', 'Admin exported scrubbed database backup', req);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="PVNutrition_Backup_${Date.now()}.json"`);
    res.send(JSON.stringify(rawData, null, 2));
  } catch (err) {
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Database Restore (Module 14: Structural Validation and Pre-Restore Safety Snapshot)
app.post('/api/admin/restore', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { backupData } = req.body;
    if (!backupData || typeof backupData !== 'object') {
      return res.status(400).json({ error: 'Invalid backup data provided' });
    }

    // Verify critical schema collections are present
    const requiredCollections = ['users', 'coaches', 'categories', 'services', 'consultations', 'payments'];
    const missingCollections = requiredCollections.filter(col => !Array.isArray(backupData[col]));
    if (missingCollections.length > 0) {
      return res.status(400).json({
        error: `Restore aborted: Backup is missing required collections: ${missingCollections.join(', ')}`
      });
    }

    // Create automated pre-restore backup snapshot to prevent permanent loss
    try {
      const dataDir = path.join(__dirname, 'data');
      const snapshotPath = path.join(dataDir, `pre_restore_safety_${Date.now()}.json`);
      fs.writeFileSync(snapshotPath, JSON.stringify(db.get(), null, 2), 'utf8');
    } catch (snapshotErr) {
      console.warn('Pre-restore snapshot note:', snapshotErr.message);
    }

    db.save(backupData);
    logAction(req.user.id, 'DATABASE_RESTORED', 'Database restored from validated backup file', req);
    res.json({ message: 'Database successfully validated and restored!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore database' });
  }
});

// Admin Coach Management Endpoints
app.post('/api/admin/coaches', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, phone, email, password, bio, experience, consultation_fee, gender, expertise, working_hours, image_url } = req.body;

    if (!name || !phone || !email || !password) {
      return res.status(400).json({ error: 'Name, phone, email, and login password are required.' });
    }

    const existingUser = db.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const newUser = db.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password_hash,
      role: 'coach',
      gender: gender || 'Not specified',
      is_verified: true
    });

    const coach = db.createCoach({
      user_id: newUser.id,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      gender: gender || 'Male',
      bio: bio || 'Wellness Coach at PV Nutrition Center.',
      experience: experience || 'Certified Wellness Coach',
      consultation_fee: Number(consultation_fee) || 200,
      expertise: Array.isArray(expertise) ? expertise : ['Weight Management', 'Balanced Nutrition'],
      working_hours: working_hours || '08:00 AM - 08:00 PM',
      image_url: image_url || '/pv_logo.png'
    });

    logAction(req.user.id, 'COACH_CREATED', `Admin created coach: ${coach.name}`, req);

    res.status(201).json({
      message: 'Coach added successfully',
      coach
    });
  } catch (err) {
    console.error('Admin add coach error:', err);
    res.status(500).json({ error: 'Failed to add coach' });
  }
});

app.put('/api/admin/coaches/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { name, phone, bio, experience, consultation_fee, is_active, gender, expertise, working_hours, image_url } = req.body;
    const coachId = req.params.id;

    const updated = db.updateCoach(coachId, {
      ...(name && { name: name.trim() }),
      ...(phone && { phone: phone.trim() }),
      ...(bio !== undefined && { bio }),
      ...(experience !== undefined && { experience }),
      ...(consultation_fee !== undefined && { consultation_fee: Number(consultation_fee) }),
      ...(is_active !== undefined && { is_active: Boolean(is_active) }),
      ...(gender && { gender }),
      ...(expertise && { expertise }),
      ...(working_hours && { working_hours }),
      ...(image_url && { image_url })
    });

    if (!updated) return res.status(404).json({ error: 'Coach not found' });
    logAction(req.user.id, 'COACH_UPDATED', `Updated coach: ${updated.name}`, req);
    res.json({ message: 'Coach updated successfully', coach: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update coach' });
  }
});

app.delete('/api/admin/coaches/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const success = db.deleteCoach(req.params.id);
    if (!success) return res.status(404).json({ error: 'Coach not found' });
    logAction(req.user.id, 'COACH_DEACTIVATED', `Deactivated coach: ${req.params.id}`, req);
    res.json({ message: 'Coach deactivated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate coach' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`PV Nutrition Center Backend Server running on http://localhost:${PORT}`);
});
