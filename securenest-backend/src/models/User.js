const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true }, // Firebase UID mapped
    email: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    phone: { type: String },
    encryptionKey: { type: String, required: true }, // The 40 char auto-rotating key
    totalStorageUsed: { type: Number, default: 0 }, // In bytes (max 50GB = 53687091200)
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
