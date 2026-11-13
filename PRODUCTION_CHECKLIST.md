# PV NUTRITION CENTRE — PRODUCTION READINESS & DEPLOYMENT CHECKLIST

Before deploying the PV Nutrition Centre platform to a public cloud or production domain, complete and verify the following operational and security configurations.

---

### 1. Secrets and Environment Variables
- [ ] **Generate Production JWT Secret**: Replace the default development secret in `.env` with a 64+ character cryptographically secure random string:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] **Production Razorpay API Keys**: Set live keys in the host environment:
  ```env
  RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx
  RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
  RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxx
  ```
- [ ] **Do Not Commit `.env`**: Confirm `.env` is listed in `.gitignore` and has never been committed to Git history.

---

### 2. Database & Data Storage
- [ ] **Data Directory Permissions**: Ensure `server/data/` has appropriate read/write permissions for the Node.js process and is excluded from public web server exposure.
- [ ] **Automated Persistent Backup Schedule**: Set up an automated daily cron snapshot of `server/data/db.json` to an off-site object storage bucket (e.g., AWS S3, Cloudflare R2, or Google Cloud Storage).
- [ ] **Pre-Deployment Database Cleanse**: Ensure any test consultations or test customer records created during development are archived before onboarding public clients.

---

### 3. HTTPS, Reverse Proxy & CORS
- [ ] **SSL/TLS Certificates**: Deploy behind an HTTPS reverse proxy (Nginx, Caddy, Cloudflare, or AWS ALB) with automated Let's Encrypt certificates.
- [ ] **CORS Configuration**: In `server/server.js`, replace `app.use(cors())` with an explicit origin allowlist:
  ```javascript
  app.use(cors({
    origin: ['https://pvnutrition.com', 'https://www.pvnutrition.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }));
  ```
- [ ] **Security Headers**: Install `helmet` middleware in Express to set `Content-Security-Policy`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, and `X-Content-Type-Options: nosniff`.

---

### 4. Authentication, Roles & Demo Accounts
- [ ] **Rotate Demo Passwords**: Update the default passwords for the seeded accounts (`admin@pvnutrition.com`, `palani@pvnutrition.com`, `vijayashanthi@pvnutrition.com`) immediately upon initial boot.
- [ ] **Session Duration**: Verify JWT expiration (currently set to 7 days) conforms with institutional security policies.

---

### 5. Razorpay Production Gateway Configuration
- [ ] **Webhook Endpoint URL**: In your Razorpay Dashboard (`Settings > Webhooks`), register your live webhook URL:
  `https://your-domain.com/api/payments/webhook`
- [ ] **Webhook Events**: Subscribe to `payment.captured`, `payment.failed`, and `refund.processed`.
- [ ] **GST and Invoicing**: Configure institutional GSTIN and business registration in the Razorpay Dashboard to ensure official tax receipts are automatically formatted.

---

### 6. Email / OTP Outbound Delivery
- [ ] **Outbound SMTP Integration**: Replace the in-app simulated email delivery in `server/server.js` with an SMTP provider (e.g., Nodemailer + SendGrid / AWS SES / Brevo):
  - Configure verification email sender: `noreply@pvnutrition.com`.
  - Configure consultation booking alerts to `contact@pvnutrition.com`.

---

### 7. File Uploads & Chat Attachments
- [ ] **Attachment Storage**: For high-volume multi-gigabyte production usage, move base64 image storage to AWS S3, Cloudinary, or Supabase Storage and store signed URLs.
- [ ] **Antivirus Scanning**: Consider integrating ClamAV or an S3 bucket scanner for user-uploaded chat attachments.

---

### 8. Logging, Monitoring & Audit Trails
- [ ] **Process Manager**: Run the Node.js backend using a process manager such as `pm2`:
  ```bash
  pm2 start server/server.js --name "pv-nutrition-api" -i max
  ```
- [ ] **Log Rotation**: Configure log rotation so audit logs in `db.json` and server logs do not exhaust disk storage.
- [ ] **Uptime Health Check**: Verify that `GET /api/categories` or a dedicated health ping returns HTTP 200 for cloud health monitors.

---

### 9. Deployment Smoke Test Suite
- [ ] **Run Regression Suite**:
  ```bash
  node tests/audit_verification.js
  ```
  Confirm all 42 tests pass with 0 failures before opening access to traffic.
- [ ] **Frontend Build**:
  ```bash
  npm run build
  ```
  Ensure Vite produces the production assets without warnings or bundle errors.
