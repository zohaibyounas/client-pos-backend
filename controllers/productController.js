const Product = require('../models/Product');
const Inventory = require('../models/Inventory');

// Helper to get active store
const getActiveStore = (req) => {
    return req.user.store || req.headers['x-store-id'];
};

// @desc    Get all products
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res) => {
    try {
        const storeId = getActiveStore(req);
        if (!storeId) return res.status(400).json({ message: 'Store context required' });

        const products = await Product.find({ store: storeId });
        res.json(products);
    } catch (error) {
        console.error(error);
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
// @access  Private
const createProduct = async (req, res) => {
    const { name, barcode, costPrice, salePrice, discount, totalStock, stock, category, items, vendor, description, warehouseId } = req.body;

    // Use totalStock (sent by frontend) or stock (alternate name)
    const initialStock = Number(totalStock) || Number(stock) || 0;

    try {
        const storeId = getActiveStore(req);
        if (!storeId) return res.status(400).json({ message: 'Store context required' });

        const productExists = await Product.findOne({ barcode, store: storeId });
        if (productExists) {
            return res.status(400).json({ message: 'Product with this barcode already exists in this store' });
        }

        const product = new Product({
            name,
            barcode,
            costPrice: Number(costPrice),
            salePrice: Number(salePrice),
            discount: Number(discount) || 0,
            totalStock: initialStock,
            category,
            vendor,
            description,
            image: req.file ? `/uploads/${req.file.filename}` : undefined,
            store: storeId
        });

        const createdProduct = await product.save();

        // If warehouse and stock are provided, create initial inventory entry
        if (warehouseId && initialStock > 0) {
            await Inventory.create({
                product: createdProduct._id,
                warehouse: warehouseId,
                quantity: initialStock
            });
        }

        res.status(201).json(createdProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = async (req, res) => {
    const { name, barcode, costPrice, salePrice, discount, totalStock, category, vendor, description } = req.body;

    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            // Check if barcode is being changed and if it conflicts in the SAME store
            if (barcode && barcode !== product.barcode) {
                const productExists = await Product.findOne({
                    barcode,
                    store: product.store,
                    _id: { $ne: product._id }
                });
                if (productExists) {
                    return res.status(400).json({ message: 'Barcode already in use' });
                }
            }

            product.name = name || product.name;
            product.barcode = barcode || product.barcode;
            product.costPrice = costPrice !== undefined ? Number(costPrice) : product.costPrice;
            product.salePrice = salePrice !== undefined ? Number(salePrice) : product.salePrice;
            product.discount = discount !== undefined ? Number(discount) : (product.discount || 0);
            product.totalStock = totalStock !== undefined ? Number(totalStock) : product.totalStock;
            product.category = category || product.category;
            product.vendor = vendor || product.vendor;
            product.description = description || product.description;

            if (req.file) {
                product.image = `/uploads/${req.file.filename}`;
            }

            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private
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

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
};
