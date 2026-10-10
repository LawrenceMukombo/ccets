const express = require('express');
const {
    getEquipment,
    getEquipmentStats,
    createEquipment,
    updateEquipment,
    deleteEquipment
} = require('../controllers/equipmentController');
const auth = require('../middleware/auth');

const router = express.Router();

const adminOnly = (req, res, next) => {
    if (req.user && (req.user.roleId === 1 || req.user.role === 'Admin' || req.user.role === 'SuperAdmin' || req.user.role_name === 'Administrator' || req.user.role_name === 'National Manager' || req.user.is_admin)) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Access denied. Administrator or Manager role required.' });
    }
};

// All routes require authentication
router.get('/', auth, getEquipment);
router.get('/stats', auth, getEquipmentStats);

// Admin Mutation Routes
router.post('/', auth, adminOnly, createEquipment);
router.put('/:id', auth, adminOnly, updateEquipment);
router.delete('/:id', auth, adminOnly, deleteEquipment);

module.exports = router;

