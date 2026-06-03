/**
 * utils/mailer.js — BorrowLocal (Render-compatible Gmail SMTP)
 *
 * KEY FIX for Render free tier:
 *   - Use port 465 + secure:true  (SSL, not STARTTLS)
 *   - Force IPv4 via `family: 4`  (Render's IPv6 routing blocks SMTP)
 *   - Use Gmail App Password (NOT your real Gmail password)
 *
 * HOW TO GET A GMAIL APP PASSWORD:
 *   1. Enable 2-Step Verification on your Google account
 *      → https://myaccount.google.com/security
 *   2. Go to → https://myaccount.google.com/apppasswords
 *   3. App name: "BorrowLocal Render"  → click Create
 *   4. Copy the 16-character password (e.g. oyei wckd fpii vtfh)
 *
 * RENDER ENV VARS TO SET:
 *   SMTP_HOST    = smtp.gmail.com
 *   SMTP_PORT    = 465
 *   SMTP_SECURE  = true
 *   SMTP_USER    = your@gmail.com
 *   SMTP_PASS    = your16charapppassword   ← no spaces
 *   EMAIL_FROM   = your@gmail.com
 */

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:    process.env.SMTP_HOST || 'smtp.gmail.com',
  port:    parseInt(process.env.SMTP_PORT, 10) || 465,
  secure:  process.env.SMTP_SECURE !== 'false', // default true (port 465 SSL)
  family:  4, // ← Force IPv4; Render free tier blocks IPv6 SMTP
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify on startup so you see connection errors in logs immediately
transporter.verify((err) => {
  if (err) {
    console.error('❌ SMTP verify failed:', err.message);
  } else {
    console.log('✅ SMTP ready — Gmail connected via port 465 (IPv4)');
  }
});

// ─── Welcome email ────────────────────────────────────────────────────────────
async function sendWelcomeEmail({ name, email }) {
  await transporter.sendMail({
    from:    `"BorrowLocal" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to:      email,
    subject: '🌱 Welcome to BorrowLocal!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:32px;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:48px;">🌱</span>
          <h1 style="color:#16a34a;margin:8px 0 0;">Welcome to BorrowLocal!</h1>
        </div>
        <div style="background:white;padding:24px;border-radius:10px;border:1px solid #e5e7eb;">
          <p style="font-size:16px;color:#374151;margin:0 0 12px;">Hi <strong>${name}</strong>,</p>
          <p style="font-size:15px;color:#4b5563;margin:0 0 12px;">
            Your account has been created successfully. You're now part of a community that believes in sharing and sustainability. 🤝
          </p>
          <p style="font-size:15px;color:#4b5563;margin:0 0 20px;">Here's what you can do next:</p>
          <ul style="font-size:15px;color:#4b5563;padding-left:20px;margin:0 0 20px;">
            <li style="margin-bottom:8px;">📦 Post items you want to lend to neighbours</li>
            <li style="margin-bottom:8px;">🔍 Browse items available near you</li>
            <li style="margin-bottom:8px;">💬 Message other members directly</li>
          </ul>
          <div style="text-align:center;margin-top:24px;">
            <a href="${process.env.CLIENT_URL || '#'}"
               style="display:inline-block;background:#16a34a;color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
              Go to BorrowLocal →
            </a>
          </div>
        </div>
        <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:20px;">
          You received this because you registered at BorrowLocal.<br/>Your email: ${email}
        </p>
      </div>
    `,
  });
}

// ─── Generic sendMail (used by requests.js) ───────────────────────────────────
async function sendMail({ to, subject, html, text }) {
  await transporter.sendMail({
    from:    `"BorrowLocal" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html:    html || `<pre style="font-family:sans-serif">${text || subject}</pre>`,
    text:    text || subject,
  });
}

module.exports = sendMail;
module.exports.sendWelcomeEmail = sendWelcomeEmail;
module.exports.sendMail = sendMail;
