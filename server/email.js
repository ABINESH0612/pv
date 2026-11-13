require('dotenv').config();
const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USERNAME = process.env.SMTP_USERNAME || '';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || SMTP_USERNAME || 'contact@pvnutrition.com';
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'PV Nutrition Centre';

let lastDispatchedEmail = null;

// Check if valid SMTP credentials have been configured
function isSmtpConfigured(isTest = false) {
  if (isTest || process.env.SMTP_HOST === 'test' || process.env.NODE_ENV === 'test') {
    return true;
  }
  if (!SMTP_USERNAME || !SMTP_PASSWORD) return false;
  if (SMTP_USERNAME.includes('your-sending-gmail') || SMTP_PASSWORD.includes('your-16-character')) {
    return false;
  }
  return true;
}

// Create reusable Nodemailer transporter
function getTransporter(isTest = false) {
  if (isTest || process.env.SMTP_HOST === 'test' || process.env.NODE_ENV === 'test') {
    return nodemailer.createTransport({
      jsonTransport: true
    });
  }

  if (!isSmtpConfigured(false)) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USERNAME,
      pass: SMTP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

function getLastDispatchedEmail() {
  return lastDispatchedEmail;
}

// Verify SMTP connection
async function verifySmtpConnection() {
  const transporter = getTransporter(false);
  if (!transporter) {
    return { configured: false, error: 'SMTP credentials are not configured.' };
  }
  try {
    await transporter.verify();
    return { configured: true, connected: true };
  } catch (err) {
    return { configured: true, connected: false, error: err.message };
  }
}

// Send Registration Verification OTP Email
async function sendVerificationOtpEmail(toEmail, otp, recipientName = 'Valued Customer', isTest = false) {
  const transporter = getTransporter(isTest);
  if (!transporter) {
    throw new Error('SMTP email delivery is not configured on the server. Please set SMTP_USERNAME and SMTP_PASSWORD in the backend environment.');
  }
  const mailOptions = {
    from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
    to: toEmail.trim().toLowerCase(),
    subject: `${otp} is your PV Nutrition Centre verification code`,
    text: `Hello ${recipientName},\n\nYour PV Nutrition Centre verification code is: ${otp}\n\nThis code is valid for 10 minutes.\n\nNever share this code with anyone.\n\nPV Nutrition Centre, Main Road, Thanjavur, Tamil Nadu. Phone: 90477 93275.`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f7f9f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #060904;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f9f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(6, 9, 4, 0.08); border: 1px solid #e5ede3;">
                <!-- Header -->
                <tr>
                  <td style="background-color: #060904; padding: 32px 40px; text-align: center;">
                    <div style="display: inline-block; padding: 6px 14px; background-color: rgba(220, 248, 209, 0.15); border: 1px solid #DCF8D1; border-radius: 20px; color: #DCF8D1; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 12px;">
                      HEALTH IS WEALTH
                    </div>
                    <h1 style="color: #DCF8D1; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.02em;">
                      PV NUTRITION CENTRE
                    </h1>
                    <p style="color: #BEB466; margin: 6px 0 0; font-size: 13px; letter-spacing: 0.04em;">
                      Online Consultation & Lifestyle Wellness Coaching
                    </p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px 40px 32px;">
                    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #060904;">
                      Verify Your Email Address
                    </h2>
                    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #4a5548;">
                      Hello <strong>${recipientName}</strong>,<br>
                      Thank you for joining PV Nutrition Centre. Please use the verification code below to verify your email address and activate your account:
                    </p>

                    <!-- OTP Code Box -->
                    <div style="background-color: #f4fbf0; border: 2px dashed #906F1F; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0;">
                      <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em; color: #634E1C; margin-bottom: 8px;">
                        YOUR 6-DIGIT VERIFICATION CODE
                      </div>
                      <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #060904; margin: 4px 0;">
                        ${otp}
                      </div>
                      <div style="font-size: 13px; color: #798A80; margin-top: 8px;">
                        ⏱️ Expires in <strong>10 minutes</strong>
                      </div>
                    </div>

                    <!-- Security Alert -->
                    <div style="background-color: #fffdf5; border-left: 4px solid #BEB466; padding: 14px 18px; border-radius: 4px; margin: 24px 0;">
                      <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #634E1C;">
                        <strong>Security Notice:</strong> Never share this code with anyone. PV Nutrition Centre staff will never contact you requesting this OTP. If you did not create this account, please ignore this email.
                      </p>
                    </div>

                    <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #4a5548;">
                      Warm regards,<br>
                      <strong>Coach Palani & Coach Vijayashanthi</strong><br>
                      PV Nutrition Centre Team
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f0f4ee; padding: 24px 40px; border-top: 1px solid #e5ede3; text-align: center; font-size: 12px; color: #798A80; line-height: 1.6;">
                    <strong>PV Nutrition Centre</strong><br>
                    Main Road, Thanjavur, Tamil Nadu 613001<br>
                    Helpline: +91 90477 93275 | +91 74182 78569<br>
                    Email: contact@pvnutrition.com
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };

  const info = await transporter.sendMail(mailOptions);
  lastDispatchedEmail = { to: toEmail, otp, timestamp: Date.now() };
  return { success: true, messageId: info.messageId };
}

// Send Password Reset OTP Email
async function sendPasswordResetEmail(toEmail, resetOtp, recipientName = 'Valued Customer', isTest = false) {
  const transporter = getTransporter(isTest);
  if (!transporter) {
    throw new Error('SMTP email delivery is not configured on the server. Please set SMTP_USERNAME and SMTP_PASSWORD in the backend environment.');
  }
  const mailOptions = {
    from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
    to: toEmail.trim().toLowerCase(),
    subject: `${resetOtp} is your PV Nutrition Centre password reset code`,
    text: `Hello ${recipientName},\n\nYour PV Nutrition Centre password reset code is: ${resetOtp}\n\nThis code is valid for 15 minutes.\n\nIf you did not request this, please ignore this email.\n\nPV Nutrition Centre Team.`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f7f9f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #060904;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f9f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(6, 9, 4, 0.08); border: 1px solid #e5ede3;">
                <tr>
                  <td style="background-color: #060904; padding: 32px 40px; text-align: center;">
                    <div style="display: inline-block; padding: 6px 14px; background-color: rgba(220, 248, 209, 0.15); border: 1px solid #DCF8D1; border-radius: 20px; color: #DCF8D1; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 12px;">
                      SECURITY ALERT
                    </div>
                    <h1 style="color: #DCF8D1; margin: 0; font-size: 24px; font-weight: 600;">
                      PV NUTRITION CENTRE
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 40px 32px;">
                    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #060904;">
                      Password Reset Request
                    </h2>
                    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #4a5548;">
                      Hello <strong>${recipientName}</strong>,<br>
                      We received a request to reset your password. Use the verification code below to set a new password:
                    </p>

                    <div style="background-color: #f4fbf0; border: 2px dashed #906F1F; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0;">
                      <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em; color: #634E1C; margin-bottom: 8px;">
                        PASSWORD RESET CODE
                      </div>
                      <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #060904; margin: 4px 0;">
                        ${resetOtp}
                      </div>
                      <div style="font-size: 13px; color: #798A80; margin-top: 8px;">
                        ⏱️ Expires in <strong>15 minutes</strong>
                      </div>
                    </div>

                    <div style="background-color: #fffdf5; border-left: 4px solid #BEB466; padding: 14px 18px; border-radius: 4px; margin: 24px 0;">
                      <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #634E1C;">
                        <strong>Security Tip:</strong> If you did not request this password reset, please secure your account immediately or contact support.
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f0f4ee; padding: 20px 40px; border-top: 1px solid #e5ede3; text-align: center; font-size: 12px; color: #798A80;">
                    PV Nutrition Centre &bull; Thanjavur, Tamil Nadu &bull; Phone: 90477 93275
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };

  const info = await transporter.sendMail(mailOptions);
  lastDispatchedEmail = { to: toEmail, otp: resetOtp, forReset: true, timestamp: Date.now() };
  return { success: true, messageId: info.messageId };
}

module.exports = {
  isSmtpConfigured,
  verifySmtpConnection,
  sendVerificationOtpEmail,
  sendPasswordResetEmail,
  getLastDispatchedEmail
};
