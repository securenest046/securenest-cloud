const mongoose = require('mongoose');

const fileMetaSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // Link to User.userId
    originalName: { type: String, required: true },
    fileSize: { type: Number, required: true }, // In bytes
    mimeType: { type: String, required: true },
    telegramMessageId: { type: String, required: true }, // Pointer to the raw payload in Telegram
    chatId: { type: String, required: true }, // Which Telegram chat the file is stored in
    iv: { type: String, required: true }, // Initialization vector used for client-side decryption
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FileMeta', fileMetaSchema);
