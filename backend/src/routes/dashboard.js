const express = require('express');
const router = express.Router({ mergeParams: true });
const dashboardController = require('../controllers/dashboardController');
const verifyToken = require('../middleware/auth');
const { attachLocationScope } = require('../middleware/locationAccess');

// Protect all dashboard routes
router.use(verifyToken);
router.use(attachLocationScope);

router.get('/operations', dashboardController.getOperationsOverview);

module.exports = router;
