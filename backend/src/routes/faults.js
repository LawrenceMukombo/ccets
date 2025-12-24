const express = require('express');
const router = express.Router();
const {
    getFaultCategoriesWithIssues,
    getFunctionalStatusOptions,
    saveTicketFaultIssues,
    getTicketFaultIssues
} = require('../controllers/faultController');
const auth = require('../middleware/auth');

// Get all fault categories with their issues
router.get('/categories', auth, getFaultCategoriesWithIssues);

// Get equipment functional status options
router.get('/functional-statuses', auth, getFunctionalStatusOptions);

// Save fault issues for a ticket
router.post('/ticket/:ticketId/issues', auth, saveTicketFaultIssues);

// Get fault issues for a ticket
router.get('/ticket/:ticketId/issues', auth, getTicketFaultIssues);

module.exports = router;
