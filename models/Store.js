const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String },
    contactNumber: { type: String },
    // Inventory can be linked here or via Warehouse model
}, { timestamps: true });

module.exports = mongoose.model('Store', storeSchema);
