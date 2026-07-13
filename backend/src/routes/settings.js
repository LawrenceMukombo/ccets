const express = require('express');
const router = express.Router({ mergeParams: true });
const { 
    getTenantConfig, updateTenantConfig, getHierarchyImpact, 
    getSettingsHistory, resetTenantConfig, exportTenantConfig,
    importTenantConfig, applyImportConfig
} = require('../controllers/settingsController');
const auth = require('../middleware/auth');

// Get settings (public-ish, needed for app config)
router.get('/config', getTenantConfig);

// Update settings (Admin only)
// Note: Assuming auth middleware sets req.user and we can check role
const adminOnly = (req, res, next) => {
    if (req.user && (req.user.roleId === 1 || req.user.role === 'Admin' || req.user.role === 'SuperAdmin' || req.user.is_admin)) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Access denied. Admin role required.' });
    }
};

router.put('/config', auth, adminOnly, updateTenantConfig);

// Settings history, rollback, and hierarchy impact (Admin only)
router.get('/history', auth, adminOnly, getSettingsHistory);
router.get('/hierarchy-impact/:levelId', auth, adminOnly, getHierarchyImpact);
router.post('/reset', auth, adminOnly, resetTenantConfig);

// Portability routes (Admin only)
router.get('/export', auth, adminOnly, exportTenantConfig);
router.post('/import', auth, adminOnly, importTenantConfig);
router.post('/import/confirm', auth, adminOnly, applyImportConfig);

module.exports = router;
