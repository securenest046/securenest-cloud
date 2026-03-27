const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    fullName: { type: String },
    phone: { type: String },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    encryptionKey: { type: String }, 
    totalStorageUsed: { type: Number, default: 0 }, 
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
