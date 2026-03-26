const express = require('express');
const router = express.Router();
const multer = require('multer');
const TelegramBot = require('node-telegram-bot-api');
const FileMeta = require('../models/FileMeta');
const User = require('../models/User');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// Multer memory storage (files up to 50MB held in memory before streaming to Telegram)
// For a production system over 50MB, chunks logic is required, but Telegram's native hard limit for bot API is 20MB-50MB depending on the specific method.
const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } });

// Upload Route
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const { userId, originalName, mimeType, ivArray } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file buffered.' });
        }

        // The user must provide a TELEGRAM_CHAT_ID (a private channel or their own chat with the bot)
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (!chatId) {
             return res.status(500).json({ success: false, error: 'CRITICAL SERVER ERROR: TELEGRAM_CHAT_ID environment variable is missing. Halting storage engine to prevent local data loss.' });
        }

        const fileOptions = {
            filename: originalName || 'encrypted_blob.bin',
            contentType: mimeType || 'application/octet-stream',
        };

        // Stream raw buffer back out to Telegram servers
        const message = await bot.sendDocument(chatId, req.file.buffer, {}, fileOptions);
        
        // Grab the static file pointer
        const telegramMessageId = message.document.file_id;

        // Save metadata pointer to MongoDB
        const newFile = new FileMeta({
            userId,
            originalName,
            fileSize: req.file.size,
            mimeType,
            telegramMessageId,
            chatId,
            iv: ivArray
        });

        await newFile.save();
        
        // Update user storage footprint allocation
        await User.findOneAndUpdate({ userId }, { $inc: { totalStorageUsed: req.file.size } });

        res.status(200).json({ success: true, file: newFile });
    } catch (error) {
        console.error("Storage Error:", error);
        res.status(500).json({ success: false, error: 'Failed to offload to storage provider.' });
    }
});

// Retrieval from Telegram CDN
router.get('/download/:fileId', async (req, res) => {
    try {
        const fileRecord = await FileMeta.findById(req.params.fileId);
        if (!fileRecord) return res.status(404).json({ success: false, message: 'File pointer not found in MongoDB' });
        
        if (fileRecord.telegramMessageId.startsWith("simulated_id_")) {
             return res.status(400).json({ success: false, error: 'Cannot download simulated file pointer from development phase in production.' });
        }

        const fileLink = await bot.getFileLink(fileRecord.telegramMessageId);
        res.status(200).json({ success: true, fileLink, meta: fileRecord });
    } catch (error) {
        console.error("Retrieval Error", error);
        res.status(500).json({ success: false, error: 'Retrieval failed from storage provider.' });
    }
});

// Fetch all metadata for a user's vault dashboard
router.get('/files/:userId', async (req, res) => {
    try {
        const files = await FileMeta.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        const user = await User.findOne({ userId: req.params.userId });
        
        let vaultKey = "A8bC9dE0fH1iJ2kL3mN4oP5qR6sT7uV8wX9yZ012"; // Fallback demo key
        if (user && user.encryptionKey) {
            vaultKey = user.encryptionKey;
        }

        res.status(200).json({ 
            success: true, 
            files, 
            totalStorageUsed: user ? user.totalStorageUsed : 0,
            vaultKey 
        });
    } catch (error) {
        console.error("Fetch Files Error:", error);
        res.status(500).json({ success: false, error: 'Failed to synchronize vault metadata.' });
    }
});

module.exports = router;
