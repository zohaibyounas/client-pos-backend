const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['admin', 'salesman', 'cashier'],
        default: 'salesman',
        required: true
    },
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' }, // Can be null for super-admin or if standard admin manages all
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
