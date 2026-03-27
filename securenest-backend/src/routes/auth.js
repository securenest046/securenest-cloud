const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { sendEmail, otpStore } = require('../utils/mailService');

// Strictly generates a 40 character alphanumeric string as requested
const generateEncryptionKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 40; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
};

// ... Existing sync route ...

// 1. Dispatch Email Verification OTP
router.post('/verify-email-request', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Identity missing.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { code: otp, expires: Date.now() + 10 * 60 * 1000 });

    const isSent = await sendEmail(
        email,
        'SecureNest - Verify Your Account',
        `<h2>Identity Verification</h2><p>Your SecureNest verification code is: <strong style="font-size: 24px;">${otp}</strong></p><p>This code expires in 10 minutes.</p>`
    );

    if (isSent) {
        res.status(200).json({ success: true, message: 'Verification dispatch successful.' });
    } else {
        res.status(500).json({ success: false, message: 'SMTP Dispatch Failure. Check backend keys.' });
    }
});

// 2. Finalize Email Verification & Sync State
router.post('/verify-email-confirm', async (req, res) => {
    const { email, otp } = req.body;
    const record = otpStore.get(email);

    if (!record || Date.now() > record.expires) {
        return res.status(400).json({ success: false, message: 'Verification link expired.' });
    }

    if (record.code === otp) {
        otpStore.delete(email);
        try {
            const user = await User.findOneAndUpdate({ email }, { emailVerified: true }, { new: true });
            return res.status(200).json({ success: true, message: 'Identity verified successfully!', user });
        } catch (e) {
            return res.status(500).json({ success: false, message: 'Database sync failure.' });
        }
    }

    res.status(400).json({ success: false, message: 'Invalid verification token.' });
});

// Sync user from Firebase to DB and establish their Encryption Vault Key
router.post('/sync', async (req, res) => {
    const { userId, email, fullName } = req.body;
    
    if (!userId || !email) {
        return res.status(400).json({ success: false, message: 'Missing core identity parameters.' });
    }

    try {
        let user = await User.findOne({ userId });
        
        // New User Registration Phase
        if (!user) {
            user = new User({
                userId,
                email,
                fullName: fullName || email.split('@')[0],
                emailVerified: false,
                encryptionKey: generateEncryptionKey()
            });
            await user.save();
        } else {
            // Core Identity Metadata Synchronization
            if (fullName && fullName !== user.fullName) user.fullName = fullName;
            if (req.body.emailVerified !== undefined) user.emailVerified = req.body.emailVerified;
            await user.save();
        }
        
        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("Auth Sync Error:", error);
        res.status(500).json({ success: false, error: 'Database synchronization failed.', detail: error.message });
    }
});

module.exports = router;
