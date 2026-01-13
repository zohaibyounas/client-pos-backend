const express = require('express');
const router = express.Router();
const { createSale, getSales, deleteSale } = require('../controllers/saleController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getSales)
    .post(protect, createSale);

router.route('/:id')
    .delete(protect, admin, deleteSale);

module.exports = router;
