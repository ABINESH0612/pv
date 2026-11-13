# PV NUTRITION CENTRE — RECORD OF DEFECTS & FIXES APPLIED

This document records all confirmed defects identified during the independent project audit, along with their root causes, files modified, specific code changes, and verification results.

---

### Defect 1: Consultation Status Privilege Escalation & Chat Payment Bypass
- **Defect ID**: FIX-01 (SEC-01)
- **Severity**: Critical
- **Affected Module**: Module 6 (Booking), Module 8 (Payments), Module 9 (Chat)
- **Reproduction**: An authenticated customer could issue a `PUT /api/consultations/:id/status` request with payload `{"status": "confirmed"}` and immediately bypass Razorpay payment, unlocking the private coaching chat.
- **Root Cause**: The route handler in `server/server.js` was protected only by `authenticateToken` with zero role checks or status transition validations.
- **Files Changed**: `server/server.js`
- **Fix Applied**: 
  - Blocked customer role from calling the endpoint (HTTP 403 Forbidden).
  - Restricted coaches to only updating assigned consultations and only transitioning between `in_progress` and `completed` (or adding coach notes).
  - Enforced that only verified payment callbacks or admin overrides can set status to `confirmed` or `paid`.
- **Regression Test**: Test #23 (`Customer Status Tampering Forbidden`) passed in `tests/audit_verification.js`.

---

### Defect 2: Razorpay Signature Verification Incompatibility & Timing Attack Vulnerability
- **Defect ID**: FIX-02 (SEC-02)
- **Severity**: High
- **Affected Module**: Module 8 (Razorpay Payments)
- **Reproduction**: Test payments created via the frontend simulation modal failed verification because `Payment.jsx` sent a signature formatted as `sig_sim_valid_<timestamp>` while `razorpay.js` expected `test_sig_<orderId>`. Furthermore, HMAC verification used `===` which is susceptible to timing side-channel attacks.
- **Root Cause**: Desynchronized simulation tokens between client and backend, plus omission of constant-time buffer comparisons.
- **Files Changed**: `server/razorpay.js`, `client/src/pages/Payment.jsx`
- **Fix Applied**:
  - Implemented `crypto.timingSafeEqual` in `server/razorpay.js` for all cryptographic comparisons.
  - Standardized test signatures in both `server/razorpay.js` and `client/src/pages/Payment.jsx` to accept `test_sig_` and `sig_sim_valid_` prefixes in test mode.
  - Added a dedicated Webhook signature verification function `verifyWebhookSignature`.
- **Regression Test**: Test #21 (`Forged/Invalid Signature Rejection`) and Test #24 (`Legitimate Signature Verification`) passed in `tests/audit_verification.js`.

---

### Defect 3: Health Assessment Broken Object Level Authorization (BOLA)
- **Defect ID**: FIX-03 (SEC-03)
- **Severity**: High
- **Affected Module**: Module 5 (Health Assessment), Module 10 (Coach Management)
- **Reproduction**: Any logged-in coach could query `GET /api/health-assessment/customer/:customerId` and access confidential health assessments of customers who had never booked with that coach.
- **Root Cause**: The route handler checked `req.user.role === 'customer'` for self-access, but permitted any `coach` without verifying assignment.
- **Files Changed**: `server/server.js`
- **Fix Applied**:
  - Added assignment verification in `server/server.js`: when `req.user.role === 'coach'`, the system verifies that at least one active consultation exists between that coach and the target customer before returning assessment data.
- **Regression Test**: Test #15 (`Unassigned Coach Access Rejection`) and Test #31 (`Assigned Coach Access to Customer Health Assessment`) passed in `tests/audit_verification.js`.

---

### Defect 4: Sensitive Password Hash Exposure in Database Backup Export
- **Defect ID**: FIX-04 (SEC-04)
- **Severity**: High
- **Affected Module**: Module 14 (Security & System Settings)
- **Reproduction**: An admin downloading the database backup via `GET /api/admin/backup` received a JSON file containing raw bcrypt password hashes for all users.
- **Root Cause**: The endpoint serialized `db.get()` directly into JSON without filtering out sensitive authentication credentials.
- **Files Changed**: `server/server.js`
- **Fix Applied**:
  - Cloned the database object and deleted `user.password_hash` from all user records before sending the JSON backup stream.
- **Regression Test**: Test #40 (`Database Backup - Password Hashes Scrubbed`) passed in `tests/audit_verification.js`.

---

### Defect 5: Booking Slot Calendar Locking Denial of Service (DOS)
- **Defect ID**: FIX-05 (SEC-05)
- **Severity**: Medium
- **Affected Module**: Module 6 (Booking & Scheduling)
- **Reproduction**: A user creating a consultation initiated an order in `pending` status. If the user abandoned payment, that slot remained blocked forever because `isSlotBooked` only excluded `status === 'cancelled'`.
- **Root Cause**: `isSlotBooked()` in `server/db.js` treated abandoned `pending` reservations identically to paid consultations.
- **Files Changed**: `server/db.js`
- **Fix Applied**:
  - Updated `isSlotBooked()` so that `pending` reservations older than 15 minutes are treated as expired and no longer block slot availability.
- **Regression Test**: Verified in Module 6 slot collision logic and unit verification.

---

### Defect 6: Unrestricted File Upload in Customer-Coach Chat
- **Defect ID**: FIX-06 (SEC-06)
- **Severity**: Medium
- **Affected Module**: Module 9 (Customer-Coach Chat)
- **Reproduction**: Users could post arbitrary payload sizes and unsupported executable file types through the `attachment_url` and `attachment_type` fields in `POST /api/chat/send`.
- **Root Cause**: Absence of file size limits and MIME type validation in the chat send handler.
- **Files Changed**: `server/server.js`
- **Fix Applied**:
  - Enforced a 2MB maximum payload limit (`attachment_url.length <= 3500000`).
  - Restricted attachments to approved MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`.
- **Regression Test**: Test #28 (`Image Attachment Validation`) and Test #29 (`Executable/Invalid Attachment Rejection`) passed in `tests/audit_verification.js`.

---

### Defect 7: Deactivated Accounts Continued Access via Existing JWTs
- **Defect ID**: FIX-07 (SEC-07)
- **Severity**: Medium
- **Affected Module**: Module 4 (Registration & Authentication)
- **Reproduction**: After an account was marked `is_active: false`, any previously issued JWT token remained valid until expiration, allowing deactivated users to continue accessing APIs.
- **Root Cause**: `authenticateToken` in `server/auth.js` only checked JWT cryptographic signature without consulting the database state.
- **Files Changed**: `server/auth.js`
- **Fix Applied**:
  - Added user lookup in `authenticateToken`: if `user.is_active === false`, the request is immediately rejected with HTTP 403 Forbidden.
- **Regression Test**: Test #41 (`Account Deactivation Endpoint`) and Test #42 (`Deactivated Account Denied Access on Token Verification`) passed in `tests/audit_verification.js`.

---

### Defect 8: Unprotected Database Restore Endpoint
- **Defect ID**: FIX-08 (SEC-08)
- **Severity**: Medium
- **Affected Module**: Module 14 (Security & System Settings)
- **Reproduction**: `POST /api/admin/restore` overwrote the database file without verifying required schema collections or creating a recovery snapshot.
- **Root Cause**: Lack of structural schema verification and lack of automated pre-restore snapshot generation.
- **Files Changed**: `server/server.js`
- **Fix Applied**:
  - Enforced validation of required collections (`users`, `coaches`, `categories`, `services`, `consultations`, `payments`).
  - Created automated pre-restore backup snapshot (`server/data/pre_restore_safety_<timestamp>.json`) prior to overwriting.
- **Regression Test**: Tested and verified during Module 14 backup/restore flow verification.
