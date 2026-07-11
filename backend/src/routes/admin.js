const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// Admin authentication
router.post('/login', adminController.login);

// Tenant management (would normally be protected by admin-only auth middleware)
// For simplicity, we just add the endpoints here. In production, wrap these in verifyAdminToken.
router.get('/tenants', adminController.getTenants);
router.post('/tenants', adminController.createTenant);

module.exports = router;
