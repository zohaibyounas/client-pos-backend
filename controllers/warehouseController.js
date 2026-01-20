const Warehouse = require('../models/Warehouse');

// Helper to get active store
const getActiveStore = (req) => {
    return req.user.store || req.headers['x-store-id'];
};

// @desc    Get all warehouses
// @route   GET /api/warehouses
// @access  Private
const getWarehouses = async (req, res) => {
    try {
        const storeId = getActiveStore(req);
        if (!storeId) return res.status(400).json({ message: 'Store context required' });

        const warehouses = await Warehouse.find({ store: storeId });
        res.json(warehouses);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create a warehouse
// @route   POST /api/warehouses
// @access  Private/Admin
const createWarehouse = async (req, res) => {
    const { name, location, contactPerson, phone } = req.body;
    try {
        const storeId = getActiveStore(req);
        if (!storeId) return res.status(400).json({ message: 'Store context required' });

        const warehouse = new Warehouse({ name, location, contactPerson, phone, store: storeId });
        const createdWarehouse = await warehouse.save();
        res.status(201).json(createdWarehouse);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update warehouse
// @route   PUT /api/warehouses/:id
// @access  Private/Admin
const updateWarehouse = async (req, res) => {
    try {
        const warehouse = await Warehouse.findById(req.params.id);
        if (warehouse) {
            warehouse.name = req.body.name || warehouse.name;
            warehouse.location = req.body.location || warehouse.location;
            warehouse.contactPerson = req.body.contactPerson || warehouse.contactPerson;
            warehouse.phone = req.body.phone || warehouse.phone;

            const updatedWarehouse = await warehouse.save();
            res.json(updatedWarehouse);
        } else {
            res.status(404).json({ message: 'Warehouse not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete warehouse
// @route   DELETE /api/warehouses/:id
// @access  Private/Admin
const deleteWarehouse = async (req, res) => {
    try {
        const warehouse = await Warehouse.findById(req.params.id);
        if (warehouse) {
            await warehouse.deleteOne();
            res.json({ message: 'Warehouse removed' });
        } else {
            res.status(404).json({ message: 'Warehouse not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse };
