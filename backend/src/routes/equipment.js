const express = require('express');
const { getEquipment, getEquipmentStats } = require('../controllers/equipmentController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.get('/', auth, getEquipment);
router.get('/stats', auth, getEquipmentStats);

module.exports = router;
