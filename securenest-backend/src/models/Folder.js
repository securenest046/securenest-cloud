const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    name: { type: String, required: true },
    parentId: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Folder', folderSchema);
