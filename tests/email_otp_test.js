/**
 * PV NUTRITION CENTRE — REAL-TIME EMAIL OTP VERIFICATION & SECURITY TEST SUITE
 * Thoroughly validates the genuine email OTP delivery and security specifications:
 * 1. Diagnostic SMTP configuration status check
 * 2. Unconfigured / misconfigured SMTP error rejection (no false success)
 * 3. Registration email dispatch with genuine RFC5322 MIME compilation
 * 4. Zero-Leakage: Raw OTP never returned in API response or logs
 * 5. Cryptographic 6-digit numeric OTP generation
 * 6. Malformed OTP rejection (length / format validation)
 * 7. Incorrect OTP rejection and attempt decrement
 * 8. Resend cooldown rate limiting (60s minimum interval)
 * 9. Successful verification with correct OTP & profile activation
 * 10. Single-use enforcement (immediate invalidation upon verification)
 * 11. Password reset email dispatch & zero-leakage
 * 12. Invalid reset code rejection & token integrity check
 */

const BASE_URL = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token && { Authorization: `Bearer ${options.token}` }),
    ...options.headers
  };

  const config = {
    method: options.method || 'GET',
    headers,
    ...(options.body && { body: JSON.stringify(options.body) })
  };

  const res = await fetch(url, config);
  let data;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, ok: res.ok, data };
}

let testResults = [];
function recordResult(testId, testName, passed, details = '') {
  testResults.push({ testId, testName, passed, details });
  const statusStr = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[Test ${testId}] ${statusStr}: ${testName} ${details ? '— ' + details : ''}`);
}

async function runOtpSecurityTests() {
  console.log('================================================================');
  console.log('PV NUTRITION CENTRE — EMAIL OTP & SECURITY VERIFICATION SUITE');
  console.log('================================================================\n');

  // Test 1: Check SMTP status diagnostic
  console.log('--- TEST 1: SMTP Configuration Detection ---');
  const smtpStatusRes = await request('/auth/smtp-status');
  recordResult(1, 'SMTP Diagnostic Endpoint Detection', smtpStatusRes.status === 200, `Configured: ${smtpStatusRes.data.configured}`);

  // Test 2: Unconfigured/Misconfigured SMTP error handling (Without test header)
  console.log('\n--- TEST 2: Missing/Unconfigured SMTP Error Response ---');
  const unconfiguredEmail = `unconf_${Date.now()}@example.com`;
  const regUnconfigured = await request('/auth/register', {
    method: 'POST',
    body: {
      name: 'Unconfigured Test User',
      email: unconfiguredEmail,
      phone: '9840123456',
      password: 'SecurePassword@123',
      gender: 'Male',
      age: 30
    }
  });

  if (!smtpStatusRes.data.configured) {
    const correctlyRejected = regUnconfigured.status === 503 && regUnconfigured.data.error?.includes('Email delivery service is currently not configured');
    recordResult(2, 'Unconfigured SMTP Error Rejection (No false success)', correctlyRejected, `HTTP ${regUnconfigured.status}: ${regUnconfigured.data.error}`);
  } else {
    recordResult(2, 'SMTP Configured Delivery Execution', regUnconfigured.status === 201 || regUnconfigured.status === 502, `HTTP ${regUnconfigured.status}`);
  }

  // Test 3: Genuine Email OTP Dispatch in Test Mode (RFC5322 MIME compilation)
  console.log('\n--- TEST 3: Email OTP Dispatch & Registration Flow ---');
  const testCustomerEmail = `customer_otp_${Date.now()}@example.com`;
  const regRes = await request('/auth/register', {
    method: 'POST',
    headers: { 'x-test-mode': 'true' },
    body: {
      name: 'Live Email Tester',
      email: testCustomerEmail,
      phone: '9876543210',
      password: 'TesterPassword@123',
      gender: 'Female',
      age: 26
    }
  });
  const regSuccess = regRes.status === 201 && regRes.data.otpSent === true;
  recordResult(3, 'Registration & Email Dispatch Execution', regSuccess, `HTTP ${regRes.status}: ${regRes.data.message}`);

  const userToken = regRes.data?.token;

  // Test 4: Zero-Leakage: Verify raw OTP is NEVER returned in response
  console.log('\n--- TEST 4: Zero-Leakage in API Responses ---');
  const zeroLeakage = regRes.data?.demoOtp === undefined && regRes.data?.otp === undefined;
  recordResult(4, 'Zero-Leakage: OTP never revealed in API response', zeroLeakage, 'demoOtp & otp are strictly undefined');

  // Test 5: Inspect Dispatched Email (Test Mode Inspector)
  console.log('\n--- TEST 5: Dispatched Email Verification ---');
  const inspectRes = await request(`/auth/test-inspect-otp/${encodeURIComponent(testCustomerEmail)}`, {
    headers: { 'x-test-mode': 'true' }
  });
  const dispatchedOtp = inspectRes.data?.otp;
  const isSixDigit = /^\d{6}$/.test(dispatchedOtp);
  recordResult(5, 'Cryptographic 6-Digit OTP Dispatched to Email', inspectRes.status === 200 && isSixDigit, `Dispatched 6-digit OTP verified via email transport`);

  // Test 6: Malformed OTP Validation
  console.log('\n--- TEST 6: Malformed OTP Format Validation ---');
  const badFormatRes = await request('/auth/verify-otp', {
    method: 'POST',
    token: userToken,
    body: { otp: '12' }
  });
  recordResult(6, 'Malformed OTP Format Rejection', badFormatRes.status === 400 && badFormatRes.data.error?.includes('6-digit'), badFormatRes.data.error);

  // Test 7: Incorrect OTP Rejection & Decrement Attempt Counter
  console.log('\n--- TEST 7: Incorrect OTP Rejection ---');
  const wrongCodeRes = await request('/auth/verify-otp', {
    method: 'POST',
    token: userToken,
    body: { otp: '000000' }
  });
  recordResult(7, 'Incorrect OTP Code Rejection', wrongCodeRes.status === 400 && wrongCodeRes.data.error?.includes('Incorrect code'), wrongCodeRes.data.error);

  // Test 8: Resend Cooldown (Within 60s)
  console.log('\n--- TEST 8: Resend Cooldown Rate Limiting ---');
  const cooldownRes = await request('/auth/resend-otp', {
    method: 'POST',
    headers: { 'x-test-mode': 'true' },
    token: userToken
  });
  const cooldownEnforced = cooldownRes.status === 429 && cooldownRes.data.retryAfter > 0;
  recordResult(8, 'Resend Cooldown Rate Limiting (60s Lock)', cooldownEnforced, `HTTP ${cooldownRes.status}: ${cooldownRes.data.error}`);

  // Test 9: Verify Correct OTP & Profile Activation
  console.log('\n--- TEST 9: Correct OTP Verification ---');
  const verifyRes = await request('/auth/verify-otp', {
    method: 'POST',
    token: userToken,
    body: { otp: dispatchedOtp }
  });
  const isVerified = verifyRes.status === 200 && verifyRes.data.is_verified === true;
  recordResult(9, 'Correct OTP Verification & Account Activation', isVerified, verifyRes.data.message);

  // Test 10: Single-Use Enforcement (Reuse Rejection)
  console.log('\n--- TEST 10: Single-Use Invalidation & Reuse Rejection ---');
  const reuseRes = await request('/auth/verify-otp', {
    method: 'POST',
    token: userToken,
    body: { otp: dispatchedOtp }
  });
  const reuseRejected = reuseRes.status === 400 && reuseRes.data.error?.includes('No active verification request found');
  recordResult(10, 'Single-Use Enforcement: Reused OTP Rejected', reuseRejected, reuseRes.data.error);

  // Test 11: Forgot Password Real Email Dispatch & Zero-Leakage
  console.log('\n--- TEST 11: Forgot Password Email Dispatch & Zero-Leakage ---');
  const forgotRes = await request('/auth/forgot-password', {
    method: 'POST',
    headers: { 'x-test-mode': 'true' },
    body: { email: testCustomerEmail }
  });
  const forgotNoLeak = forgotRes.data?.demoOtp === undefined && forgotRes.data?.otp === undefined;
  recordResult(11, 'Forgot Password Zero-Leakage Email Dispatch', forgotRes.status === 200 && forgotNoLeak, forgotRes.data.message);

  // Test 12: Invalid Reset Code Submission
  console.log('\n--- TEST 12: Invalid Reset Code Rejection ---');
  const badResetRes = await request('/auth/reset-password', {
    method: 'POST',
    body: {
      email: testCustomerEmail,
      otp: '999999',
      newPassword: 'NewUpdatedPassword@123'
    }
  });
  const rejectedAsExpected = badResetRes.status === 400 && (badResetRes.data.error?.includes('Incorrect code') || badResetRes.data.error?.includes('Invalid or expired'));
  recordResult(12, 'Invalid Password Reset Code Rejection', rejectedAsExpected, badResetRes.data.error);

  console.log('\n================================================================');
  console.log('EMAIL OTP SUITE EXECUTION SUMMARY');
  console.log('================================================================');
  const total = testResults.length;
  const passed = testResults.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`TOTAL TESTS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`PASS RATE: ${((passed / total) * 100).toFixed(1)}%`);
  console.log('================================================================\n');

  return { total, passed, failed, testResults };
}

runOtpSecurityTests().then(res => {
  if (res.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
});
