const mongoose = require('mongoose');

const fileMetaSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    originalName: { type: String, required: true },
    fileSize: { type: Number, required: true }, 
    mimeType: { type: String, required: true },
    telegramMessageId: { type: String, required: false }, 
    chatId: { type: String, required: false },
    iv: { type: String, required: false },
    isFolder: { type: Boolean, default: false },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'FileMeta', default: null },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FileMeta', fileMetaSchema);
