const express = require('express');
const router = express.Router();
const { getAuditLogs, exportAuditLogs } = require('../controllers/auditController');
const auth = require('../middleware/auth');

// Get audit logs (protected, admin only ideally)
router.get('/', auth, getAuditLogs);

// Export audit logs
router.get('/export', auth, exportAuditLogs);

module.exports = router;
