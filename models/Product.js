const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    barcode: { type: String, required: true, unique: true },
    costPrice: { type: Number, required: true },
    salePrice: { type: Number, required: true },
    discount: { type: Number, default: 0 }, // Product-wise discount
    vendor: { type: String },
    category: { type: String },
    image: { type: String }, // Path or URL to image
    description: { type: String },
    // For simplicity, we can track total stock here, 
    // but we'll also use an Inventory model for warehouse-specific tracking
    totalStock: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
