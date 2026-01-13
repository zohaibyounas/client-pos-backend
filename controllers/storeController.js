const Store = require('../models/Store');

// @desc    Get all stores
// @route   GET /api/stores
// @access  Private/Admin
const getStores = async (req, res) => {
    try {
        const stores = await Store.find();
        res.json(stores);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create a store
// @route   POST /api/stores
// @access  Private/Admin
const createStore = async (req, res) => {
    const { name, location, contactNumber } = req.body;
    try {
        const store = new Store({
            name,
            location,
            contactNumber
        });
        const createdStore = await store.save();
        res.status(201).json(createdStore);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getStores, createStore };
