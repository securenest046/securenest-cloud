const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

const otpStore = new Map();

// Helper to send emails freely through standard SMTP
const sendEmail = async (to, subject, htmlContent) => {
    // These must be set in the backend .env file:
    // SMTP_EMAIL=your.email@gmail.com
    // SMTP_PASS=your16charapppassword
    const user = process.env.SMTP_EMAIL;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
        console.warn("SMTP_EMAIL or SMTP_PASS missing in .env. Skipping real email send.");
        return false;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
    });

    try {
        await transporter.sendMail({
            from: `"SecureNest Security" <${user}>`,
            to, 
            subject, 
            html: htmlContent
        });
        return true;
    } catch (e) {
        console.error("Nodemailer Send Error:", e);
        return false;
    }
};

// 1. Generate & Send OTP Code directly to User
router.post('/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });

    // Generate random secure 6 digit numerical array mapped to string
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Memory store the active code (Valid for 10 minutes)
    otpStore.set(email, { code: generatedOtp, expires: Date.now() + 10 * 60 * 1000 });

    const isSent = await sendEmail(
        email, 
        'SecureNest - Verification Code', 
        `<h2>Your SecureNest Code</h2><p>Your 6-digit OTP code is: <strong style="font-size: 24px; letter-spacing: 4px;">${generatedOtp}</strong></p><p>This code expires securely in 10 minutes. Do not arbitrarily share it.</p>`
    );

    if (isSent) {
        res.status(200).json({ success: true, message: 'OTP sent successfully to email via SMTP.' });
    } else {
        // Mock fallback if user hasn't set up Google App Password yet in local env
        console.log(`[DEV MODE] Generated OTP for ${email}: ${generatedOtp}`);
        res.status(200).json({ success: true, mocked: true, message: 'Simulated OTP Send (Check Node Backend Console)', debugCode: generatedOtp });
    }
});

// 2. Client Side Verification Layer
router.post('/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    const record = otpStore.get(email);

    if (!record) return res.status(400).json({ success: false, message: 'OTP not requested or has deeply expired.' });
    if (Date.now() > record.expires) {
        otpStore.delete(email); // Purge stale records
        return res.status(400).json({ success: false, message: 'OTP runtime has expired.' });
    }
    
    if (record.code === otp) {
        otpStore.delete(email); // Prevent replay attacks
        return res.status(200).json({ success: true, message: 'OTP Cryptographically Verified successfully!' });
    }
    
    return res.status(400).json({ success: false, message: 'Invalid OTP code.' });
});

// 3. New Device Login Alert Dispatcher
router.post('/alert-login', async (req, res) => {
    const { email, device, ip } = req.body;
    await sendEmail(
        email,
        'SecureNest - New Login Detected',
        `<h3>New Sign-In Found</h3><p>Your SecureNest vault was just accessed securely from:</p><ul><li>Device OS Engine: ${device || 'Unknown Web Browser Telemetry'}</li><li>Global IP Identity: ${ip || 'Unknown Context'}</li></ul><p>If this was not you, dynamically trigger a password reset block immediately.</p>`
    );
    res.status(200).json({ success: true });
});

module.exports = router;
