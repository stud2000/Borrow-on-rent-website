const nodemailer = require('nodemailer');

// Log SMTP configuration on startup
console.log('📧 Initializing mail transporter...');
console.log('   SMTP_HOST:', process.env.SMTP_HOST);
console.log('   SMTP_PORT:', process.env.SMTP_PORT);
console.log('   SMTP_SECURE:', process.env.SMTP_SECURE);
console.log('   SMTP_USER:', process.env.SMTP_USER);
console.log('   EMAIL_FROM:', process.env.EMAIL_FROM);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
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
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'no-reply@borrowlocal.com',
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}`);
    console.log(`   MessageID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ Email failed for ${to}:`);
    console.error(`   Error Code: ${error.code}`);
    console.error(`   Error Message: ${error.message}`);
    console.error(`   Full Error:`, error);
    throw error; // Re-throw so caller knows it failed
  }
}

module.exports = sendMail;
