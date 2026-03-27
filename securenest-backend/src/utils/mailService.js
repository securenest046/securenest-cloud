const nodemailer = require('nodemailer');

// Shared In-Memory OTP Store (Valid for 10 minutes)
const otpStore = new Map();

// High-Fidelity SMTP Dispatcher
const sendEmail = async (to, subject, htmlContent) => {
    // These must be set in the system environment variables:
    // SMTP_EMAIL=your.email@gmail.com
    // SMTP_PASS=your16charapppassword
    const user = process.env.SMTP_EMAIL;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
        console.error("[CRITICAL] SMTP_EMAIL or SMTP_PASS missing. Dispatch aborted.");
        return false;
    }

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, 
        auth: { 
            user: user.trim(), 
            pass: pass.trim() 
        }
    });

    try {
        await transporter.sendMail({
            from: `"SecureNest Vault" <${user}>`,
            to, 
            subject, 
            html: htmlContent
        });
        return true;
    } catch (e) {
        console.error("Nodemailer Dispatch Failure:", e.message);
        return false;
    }
};

module.exports = {
    sendEmail,
    otpStore
};
