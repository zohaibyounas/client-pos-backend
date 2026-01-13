const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');

// @desc    Create new sale
// @route   POST /api/sales
const createSale = async (req, res) => {
    const {
        store, salesman, items, subtotal,
        invoiceDiscount, totalAmount, paidAmount
    } = req.body;

    try {
        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No items in sale' });
        }

        const invoiceId = `INV-${Date.now()}`;

        // Enrich items with current costPrice from Products
        const enrichedItems = [];
        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(404).json({ message: `Product ${item.product} not found` });
            }
            enrichedItems.push({
                product: item.product,
                quantity: item.quantity,
                costPrice: product.costPrice,
                price: item.price,
                total: item.total
            });
        }

        const sale = new Sale({
            store,
            salesman,
            items: enrichedItems,
            subtotal,
            invoiceDiscount,
            totalAmount,
            paidAmount,
            invoiceId,
            paymentStatus: paidAmount >= totalAmount ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid')
        });

        const createdSale = await sale.save();

        // Update Stock (now using the same enrichedItems loop)
        for (const item of enrichedItems) {
            const product = await Product.findById(item.product);
            if (product) {
                product.totalStock -= item.quantity;
                await product.save();

                // Also update first available warehouse inventory for now 
                // In a real scenario, we'd pick the warehouse of the store
                const inventory = await Inventory.findOne({ product: item.product });
                if (inventory) {
                    inventory.quantity -= item.quantity;
                    await inventory.save();
                }
            }
        }

        const populatedSale = await Sale.findById(createdSale._id)
            .populate('items.product', 'name barcode')
            .populate('store', 'name');

        res.status(201).json(populatedSale);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all sales
// @route   GET /api/sales
const getSales = async (req, res) => {
    try {
        const sales = await Sale.find().populate('salesman', 'name email').populate('store', 'name');
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete a sale (Void)
// @route   DELETE /api/sales/:id
const deleteSale = async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id);
        if (sale) {
            // Revert Stock
            for (const item of sale.items) {
                const product = await Product.findById(item.product);
                if (product) {
                    product.totalStock += item.quantity;
                    await product.save();
                }
            }
            await sale.deleteOne();
            res.json({ message: 'Sale removed and stock reverted' });
        } else {
            res.status(404).json({ message: 'Sale not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { createSale, getSales, deleteSale };
