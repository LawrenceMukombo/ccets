const express = require('express');
const router = express.Router();
const facilityController = require('../controllers/facilityController');
const authMiddleware = require('../middleware/auth');
const { attachLocationScope } = require('../middleware/locationAccess');

// Apply auth and location scope to all facility routes
router.get('/', authMiddleware, attachLocationScope, facilityController.getAllFacilities);
router.get('/statistics', authMiddleware, attachLocationScope, facilityController.getStatistics);
router.get('/regions', authMiddleware, attachLocationScope, facilityController.getRegions);
router.get('/provinces', authMiddleware, attachLocationScope, facilityController.getProvinces);
router.get('/districts/:provinceId', authMiddleware, attachLocationScope, facilityController.getDistricts);
router.get('/district/:districtId', authMiddleware, attachLocationScope, facilityController.getFacilitiesByDistrict);
router.get('/:id', authMiddleware, attachLocationScope, facilityController.getFacilityById);
router.get('/:id/equipment', authMiddleware, attachLocationScope, facilityController.getFacilityEquipment);

module.exports = router;
