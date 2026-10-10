const express = require('express');
const router = express.Router({ mergeParams: true });
const facilityController = require('../controllers/facilityController');
const authMiddleware = require('../middleware/auth');
const { attachLocationScope } = require('../middleware/locationAccess');

const adminOnly = (req, res, next) => {
    if (req.user && (req.user.roleId === 1 || req.user.role === 'Admin' || req.user.role === 'SuperAdmin' || req.user.role_name === 'Administrator' || req.user.role_name === 'National Manager' || req.user.is_admin)) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Access denied. Administrator or Manager role required.' });
    }
};

// Apply auth and location scope to all facility routes
router.get('/', authMiddleware, attachLocationScope, facilityController.getAllFacilities);
router.get('/statistics', authMiddleware, attachLocationScope, facilityController.getStatistics);
router.get('/regions', authMiddleware, attachLocationScope, facilityController.getRegions);
router.get('/provinces', authMiddleware, attachLocationScope, facilityController.getProvinces);
router.get('/districts/:provinceId', authMiddleware, attachLocationScope, facilityController.getDistricts);
router.get('/district/:districtId', authMiddleware, attachLocationScope, facilityController.getFacilitiesByDistrict);
router.get('/:id', authMiddleware, attachLocationScope, facilityController.getFacilityById);
router.get('/:id/equipment', authMiddleware, attachLocationScope, facilityController.getFacilityEquipment);

// Admin Mutation Routes
router.post('/', authMiddleware, adminOnly, facilityController.createFacility);
router.put('/:id', authMiddleware, adminOnly, facilityController.updateFacility);
router.delete('/:id', authMiddleware, adminOnly, facilityController.deleteFacility);

module.exports = router;

