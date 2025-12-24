const express = require('express');
const router = express.Router();
const {
    getSpareParts,
    getSparePartsByCategory
} = require('../controllers/sparePartsController');
const auth = require('../middleware/auth');

// Get all spare parts
router.get('/', auth, getSpareParts);

// Get spare parts by category
router.get('/category/:category', auth, getSparePartsByCategory);

module.exports = router;
