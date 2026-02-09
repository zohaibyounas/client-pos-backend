const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    barcode: { type: String, required: false, default: '' }, // Optional barcode
    costPrice: { type: Number, required: true },
    salePrice: { type: Number, required: true },
    discount: { type: Number, default: 0 }, // Product-wise discount
    vendor: { type: String },
    category: { type: String },
    image: { type: String }, // Path or URL to image
    description: { type: String },
    // For simplicity, we can track total stock here, 
    // but we'll also use an Inventory model for warehouse-specific tracking
    totalStock: { type: Number, default: 0 },
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true }
}, { timestamps: true });

// Compound index to ensure unique barcode PER STORE (sparse to allow empty barcodes)
productSchema.index({ barcode: 1, store: 1 }, { unique: true, sparse: true, partialFilterExpression: { barcode: { $exists: true, $ne: '' } } });

module.exports = mongoose.model('Product', productSchema);
