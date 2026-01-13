const express = require('express');
const router = express.Router();
const { getStores, createStore } = require('../controllers/storeController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, admin, getStores)
    .post(protect, admin, createStore);

module.exports = router;
