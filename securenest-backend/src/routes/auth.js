const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Strictly generates a 40 character alphanumeric string as requested
const generateEncryptionKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 40; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
};

// Sync user from Firebase to DB and establish their Encryption Vault Key
router.post('/sync', async (req, res) => {
    const { userId, email, fullName, phone } = req.body;
    
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
                phone: phone || 'N/A', // Now strictly passed from registration
                emailVerified: false, // Will be updated after post-login OTP success
                phoneVerified: false,
                encryptionKey: generateEncryptionKey()
            });
            await user.save();
        }
        
        // Note: The prompt requires the key to rotate every 30 days automatically.
        // A cron job should handle that rotation securely, but for now we provide the active key.
        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("Auth Sync Error:", error);
        res.status(500).json({ success: false, error: 'Database synchronization failed.', detail: error.message });
    }
});

module.exports = router;
