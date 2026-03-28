const express = require('express');
const router = express.Router();
const multer = require('multer');
const TelegramBot = require('node-telegram-bot-api');
const FileMeta = require('../models/FileMeta');
const User = require('../models/User');
const axios = require('axios');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// Multer memory storage (files up to 50MB held in memory before streaming to Telegram)
// For a production system over 50MB, chunks logic is required, but Telegram's native hard limit for bot API is 20MB-50MB depending on the specific method.
const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } });

// Upload Route
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const { userId, originalName, mimeType, ivArray, parentId } = req.body;
        
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
            iv: ivArray,
            parentId: parentId || null
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

// Create Folder Route (Idempotent Find-or-Create)
router.post('/folder', async (req, res) => {
    try {
        const { userId, originalName, parentId } = req.body;
        
        // Atomic check for existing directory container
        let folder = await FileMeta.findOne({ 
            userId, 
            originalName, 
            parentId: parentId || null, 
            isFolder: true 
        });

        if (!folder) {
            folder = new FileMeta({
                userId,
                originalName,
                fileSize: 0,
                mimeType: 'folder',
                isFolder: true,
                parentId: parentId || null
            });
            await folder.save();
        }

        res.status(200).json({ success: true, folder });
    } catch (error) {
        console.error("Folder Creation Error:", error);
        res.status(500).json({ success: false, error: 'Failed to generate vault directory.' });
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

// Binary Proxy: Fetches encrypted bytes from Telegram to bypass browser CORS
router.get('/proxy/:fileId', async (req, res) => {
    try {
        const fileRecord = await FileMeta.findById(req.params.fileId);
        if (!fileRecord) return res.status(404).json({ success: false, error: 'File record missing' });
        
        // Use the file_id (which we stored in telegramMessageId field during upload)
        const fileLink = await bot.getFileLink(fileRecord.telegramMessageId);
        
        // Fetch the raw encrypted buffer from Telegram
        const response = await axios.get(fileLink, { responseType: 'arraybuffer' });
        
        // Stream back to frontend
        res.set({
            'Content-Type': 'application/octet-stream',
            'Content-Length': response.data.byteLength,
            'Access-Control-Expose-Headers': 'Content-Disposition'
        });
        
        res.send(Buffer.from(response.data));
    } catch (error) {
        console.error("Proxy Retrieval Error:", error);
        res.status(500).json({ success: false, error: 'Failed to stream vault data from Telegram bridge.' });
    }
});

// Fetch all metadata for a user's vault dashboard
router.get('/files/:userId', async (req, res) => {
    try {
        const parentId = req.query.parentId === 'null' ? null : (req.query.parentId || null);
        const files = await FileMeta.find({ userId: req.params.userId, parentId }).sort({ isFolder: -1, createdAt: -1 });
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
        res.status(500).json({ success: false, error: 'Failed to synchronize vault metadata.', detail: error.message });
    }
});

// Decommission file or folder recursively from vault registry
router.delete('/:fileId', async (req, res) => {
    try {
        const targetId = req.params.fileId;
        
        const decommissionRecursive = async (id) => {
            const item = await FileMeta.findById(id);
            if (!item) return;

            if (item.isFolder) {
                const children = await FileMeta.find({ parentId: id });
                for (const child of children) {
                    await decommissionRecursive(child._id);
                }
            } else {
                // Decrement user storage footprint for files
                await User.findOneAndUpdate(
                    { userId: item.userId }, 
                    { $inc: { totalStorageUsed: -item.fileSize } }
                );
            }

            // Remove metadata from registry
            await FileMeta.findByIdAndDelete(id);
        };

        const topLevelItem = await FileMeta.findById(targetId);
        if (!topLevelItem) return res.status(404).json({ success: false, message: 'Identity pointer not found.' });

        await decommissionRecursive(targetId);

        res.status(200).json({ success: true, message: 'Vault identity and all nested children decommissioned successfully.' });
    } catch (error) {
        console.error("Decommission Error:", error);
        res.status(500).json({ success: false, error: 'Registry purge failed.', detail: error.message });
    }
});

// Rename file or folder
router.patch('/rename/:fileId', async (req, res) => {
    try {
        const { newName } = req.body;
        if (!newName) return res.status(400).json({ success: false, message: 'New name is required.' });

        const file = await FileMeta.findByIdAndUpdate(req.params.fileId, { originalName: newName }, { new: true });
        if (!file) return res.status(404).json({ success: false, message: 'Identity pointer not found.' });

        res.status(200).json({ success: true, file });
    } catch (error) {
        console.error("Rename Error:", error);
        res.status(500).json({ success: false, error: 'Failed to rename vault identity.' });
    }
});

// Fetch all nested metadata recursively for bulk operations (e.g., ZIP download)
router.get('/files/:userId/recursive/:folderId', async (req, res) => {
    try {
        const { userId, folderId } = req.params;
        
        const resolveRecursive = async (id, currentPath = "") => {
            let files = [];
            const items = await FileMeta.find({ userId, parentId: id });
            
            for (const item of items) {
                if (item.isFolder) {
                    const nested = await resolveRecursive(item._id, `${currentPath}${item.originalName}/`);
                    files = files.concat(nested);
                } else {
                    files.push({ ...item.toObject(), relativePath: `${currentPath}${item.originalName}` });
                }
            }
            return files;
        };

        const allNestedFiles = await resolveRecursive(folderId);
        res.status(200).json({ success: true, files: allNestedFiles });
    } catch (error) {
        console.error("Recursive discovery error:", error);
        res.status(500).json({ success: false, error: 'Failed to map nested vault hierarchy.' });
    }
});

// Fetch single identity metadata
router.get('/metadata/:fileId', async (req, res) => {
    try {
        const file = await FileMeta.findById(req.params.fileId);
        if (!file) return res.status(404).json({ success: false, message: 'Identity pointer not found.' });
        res.status(200).json({ success: true, file });
    } catch (error) {
        console.error("Metadata Retrieval Error:", error);
        res.status(500).json({ success: false, error: 'Metadata retrieval failed.' });
    }
});

module.exports = router;
