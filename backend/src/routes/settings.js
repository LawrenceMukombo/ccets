const express = require('express');
const router = express.Router({ mergeParams: true });
const { getTenantConfig, updateTenantConfig } = require('../controllers/settingsController');
const auth = require('../middleware/auth');

// Get settings (public-ish, needed for app config)
router.get('/config', getTenantConfig);

// Update settings (Admin only)
// Note: Assuming auth middleware sets req.user and we can check role
const adminOnly = (req, res, next) => {
    if (req.user && (req.user.role === 'Admin' || req.user.role === 'SuperAdmin' || req.user.is_admin)) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Access denied. Admin role required.' });
    }
};

router.put('/config', auth, adminOnly, updateTenantConfig);

module.exports = router;
