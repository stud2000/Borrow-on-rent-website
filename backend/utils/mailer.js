/**
 * mailer.js — Unified email sender for BorrowLocal
 *
 * WHY THE OLD CODE FAILED:
 *   Render's free tier blocks outbound SMTP on port 587/465.
 *   The hardcoded Gmail IP (172.217.214.108) also breaks TLS and
 *   gets rotated by Google, making it doubly unreliable.
 *
 * THIS FILE supports three providers, checked in order:
 *   1. Resend  (RESEND_API_KEY set)     — HTTPS API, works on Render free
 *   2. SendGrid (SENDGRID_API_KEY set)  — HTTPS API, works on Render free
 *   3. Nodemailer SMTP fallback         — works only if your host allows SMTP
 *
 * ── RECOMMENDED SETUP (free, works on Render) ────────────────────────────────
 *   Sign up at https://resend.com → get an API key → add to Render env vars:
 *     RESEND_API_KEY=re_xxxxxxxxxxxx
 *     EMAIL_FROM=no-reply@yourdomain.com   (must be a verified domain in Resend)
 *
 *   OR sign up at https://sendgrid.com → get API key → add:
 *     SENDGRID_API_KEY=SG.xxxxxxxxxxxx
 *     EMAIL_FROM=no-reply@yourdomain.com   (must be verified sender in SendGrid)
 *
 *   OR for quick testing with Gmail App Password (only if your host allows SMTP):
 *     SMTP_HOST=smtp.gmail.com
 *     SMTP_PORT=587
 *     SMTP_USER=your@gmail.com
 *     SMTP_PASS=your-app-password        (generate at myaccount.google.com/apppasswords)
 *     EMAIL_FROM="BorrowLocal <your@gmail.com>"
 * ─────────────────────────────────────────────────────────────────────────────
 */

const nodemailer = require('nodemailer');

// ── Detect which provider is configured ──────────────────────────────────────
const PROVIDER = (() => {
  if (process.env.RESEND_API_KEY)    return 'resend';
  if (process.env.SENDGRID_API_KEY)  return 'sendgrid';
  if (process.env.SMTP_HOST)         return 'smtp';
  return 'none';
})();

console.log(`📧 Email provider: ${PROVIDER.toUpperCase()}`);
if (PROVIDER === 'none') {
  console.warn('⚠️  No email provider configured. Emails will be silently skipped.');
  console.warn('   Set RESEND_API_KEY, SENDGRID_API_KEY, or SMTP_HOST in your env vars.');
}

// ── Build nodemailer transporter (SMTP only) ──────────────────────────────────
let smtpTransporter = null;
if (PROVIDER === 'smtp') {
  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,          // e.g. smtp.gmail.com
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  smtpTransporter.verify((err, ok) => {
    if (err) {
      console.error('❌ SMTP verification failed:', err.message);
      console.error('   Hint: Render free tier blocks port 587/465. Use Resend or SendGrid instead.');
    } else {
      console.log('✅ SMTP verified successfully');
    }
  });
}

// ── Resend sender ─────────────────────────────────────────────────────────────
async function sendViaResend({ to, subject, html, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'no-reply@borrowlocal.com',
      to: [to],
      subject,
      html: html || `<pre>${text}</pre>`,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || `Resend API error ${res.status}`);
    err.code = `RESEND_${res.status}`;
    throw err;
  }
  return await res.json();
}

// ── SendGrid sender ───────────────────────────────────────────────────────────
async function sendViaSendGrid({ to, subject, html, text }) {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: process.env.EMAIL_FROM || 'no-reply@borrowlocal.com' },
      subject,
      content: [
        { type: 'text/plain', value: text || subject },
        ...(html ? [{ type: 'text/html', value: html }] : []),
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.errors?.[0]?.message || `SendGrid error ${res.status}`;
    const err = new Error(msg);
    err.code = `SENDGRID_${res.status}`;
    throw err;
  }
  // SendGrid returns 202 with no body on success
  return { success: true };
}

// ── Main sendMail function ────────────────────────────────────────────────────
async function sendMail({ to, subject, html, text }) {
  if (!to) {
    console.warn('⚠️  sendMail called with no recipient — skipping');
    return;
  }

  if (PROVIDER === 'none') {
    console.warn(`⚠️  Email to ${to} skipped (no provider configured)`);
    return;
  }

  console.log(`📧 Sending email to ${to} via ${PROVIDER.toUpperCase()}...`);

  try {
    let result;

    if (PROVIDER === 'resend') {
      result = await sendViaResend({ to, subject, html, text });
    } else if (PROVIDER === 'sendgrid') {
      result = await sendViaSendGrid({ to, subject, html, text });
    } else {
      // SMTP (nodemailer)
      result = await smtpTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'no-reply@borrowlocal.com',
        to,
        subject,
        text,
        html,
      });
    }

    console.log(`✅ Email sent to ${to}`);
    return result;
  } catch (error) {
    console.error(`❌ Email failed for ${to}:`);
    console.error(`   Provider : ${PROVIDER}`);
    console.error(`   Code     : ${error.code || 'N/A'}`);
    console.error(`   Message  : ${error.message}`);
    if (PROVIDER === 'smtp' && (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED')) {
      console.error('   💡 Render free tier blocks SMTP. Switch to RESEND_API_KEY or SENDGRID_API_KEY.');
    }
    throw error;
  }
}

module.exports = sendMail;
