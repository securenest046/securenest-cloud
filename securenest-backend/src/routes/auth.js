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
