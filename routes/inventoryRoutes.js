const express = require('express');
const router = express.Router();
const { getInventoryByProduct, updateStock } = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, updateStock);

router.route('/product/:productId')
    .get(protect, getInventoryByProduct);

module.exports = router;
