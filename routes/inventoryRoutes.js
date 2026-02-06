const express = require('express');
const router = express.Router();
const { getInventoryByProduct, getInventoryByWarehouse, updateStock } = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, updateStock);

router.route('/product/:productId')
    .get(protect, getInventoryByProduct);

router.route('/warehouse/:warehouseId')
    .get(protect, getInventoryByWarehouse);

module.exports = router;
