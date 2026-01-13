const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getSalesReport,
    getTopSelling
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, getDashboardStats);
router.get('/sales-report', protect, getSalesReport);
router.get('/top-selling', protect, getTopSelling);

module.exports = router;
