const nodemailer = require('nodemailer');

console.log('📧 Initializing mail transporter...');
console.log('   SMTP_HOST:', process.env.SMTP_HOST);
console.log('   SMTP_PORT:', process.env.SMTP_PORT);
console.log('   SMTP_SECURE:', process.env.SMTP_SECURE);
console.log('   SMTP_USER:', process.env.SMTP_USER);
console.log('   EMAIL_FROM:', process.env.EMAIL_FROM);

const transporter = nodemailer.createTransport({
  host: '172.217.214.108', // Gmail SMTP IPv4 — bypasses Render's IPv6 block
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
    servername: 'smtp.gmail.com' // still verify against Gmail's cert
  }
});

// Verify transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Transporter verification FAILED:', error.message);
    console.error('   Code:', error.code);
    console.error('   Response:', error.response);
  } else {
    console.log('✅ SMTP Transporter verified successfully!');
  }
});

async function sendMail({ to, subject, html, text }) {
  try {
    console.log(`📧 Attempting to send email to ${to}...`);
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'no-reply@borrowlocal.com',
      to,
      subject,
      text,
      html,
    });
    console.log(`✅ Email sent successfully to ${to}`);
    console.log(`   MessageID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ Email failed for ${to}:`);
    console.error(`   Error Code: ${error.code}`);
    console.error(`   Error Message: ${error.message}`);
    throw error;
  }
}

module.exports = sendMail;
