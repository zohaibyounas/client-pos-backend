const Inventory = require('../models/Inventory');

// @desc    Get inventory by product
// @route   GET /api/inventory/product/:productId
const getInventoryByProduct = async (req, res) => {
    try {
        const inventory = await Inventory.find({ product: req.params.productId })
            .populate('warehouse', 'name location');
        res.json(inventory);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update stock in warehouse
// @route   POST /api/inventory
const updateStock = async (req, res) => {
    const { productId, warehouseId, quantity } = req.body;
    try {
        let inventory = await Inventory.findOne({ product: productId, warehouse: warehouseId });
        if (inventory) {
            inventory.quantity += Number(quantity);
            await inventory.save();
        } else {
            inventory = await Inventory.create({
                product: productId,
                warehouse: warehouseId,
                quantity: Number(quantity)
            });
        }
        res.json(inventory);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getInventoryByProduct, updateStock };
