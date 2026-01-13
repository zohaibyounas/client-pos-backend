const Product = require('../models/Product');
const Inventory = require('../models/Inventory');

// @desc    Get all products
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Private
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
    const {
        name, barcode, costPrice, salePrice,
        discount, vendor, category, totalStock,
        warehouseId
    } = req.body;

    try {
        // Check if barcode already exists
        const barcodeExists = await Product.findOne({ barcode });
        if (barcodeExists) {
            return res.status(400).json({ message: 'Barcode already exists' });
        }

        const product = new Product({
            name, barcode, costPrice, salePrice,
            discount, vendor, category, totalStock,
            image: req.file ? `/uploads/${req.file.filename}` : ''
        });

        const createdProduct = await product.save();

        // If warehouseId and initial stock provided, create inventory entry
        if (warehouseId && totalStock > 0) {
            await Inventory.create({
                product: createdProduct._id,
                warehouse: warehouseId,
                quantity: totalStock
            });
        }

        res.status(201).json(createdProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            product.name = req.body.name || product.name;
            product.barcode = req.body.barcode || product.barcode;
            product.costPrice = req.body.costPrice || product.costPrice;
            product.salePrice = req.body.salePrice || product.salePrice;
            product.discount = req.body.discount || product.discount;
            product.vendor = req.body.vendor || product.vendor;
            product.category = req.body.category || product.category;
            product.totalStock = req.body.totalStock !== undefined ? req.body.totalStock : product.totalStock;

            if (req.file) {
                product.image = `/uploads/${req.file.filename}`;
            }

            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            await product.deleteOne();
            res.json({ message: 'Product removed' });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct };
