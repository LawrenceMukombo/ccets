const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authMiddleware = require('../middleware/auth');
const { attachLocationScope } = require('../middleware/locationAccess');

// Specific routes MUST come before parameterized routes
router.get('/my-tickets', authMiddleware, attachLocationScope, ticketController.getMyTickets);
router.get('/stats/by-province', authMiddleware, attachLocationScope, ticketController.getTicketsByProvince);
router.get('/stats/equipment-distribution', authMiddleware, ticketController.getEquipmentDistribution);
router.get('/stats/fault-categories', authMiddleware, ticketController.getTopFaultCategories);
router.get('/stats/monthly-trends', authMiddleware, ticketController.getMonthlyTrends);
router.get('/stats/equipment-health', authMiddleware, ticketController.getEquipmentHealthByRegion);

// General routes
router.get('/', authMiddleware, attachLocationScope, ticketController.getAllTickets);
router.post('/', authMiddleware, attachLocationScope, ticketController.createTicket);

// Parameterized routes (these use :id so must come after specific routes)
router.get('/:id', authMiddleware, attachLocationScope, ticketController.getTicketById);
router.post('/:id/assign', authMiddleware, attachLocationScope, ticketController.assignTicket);
router.post('/:id/start-work', authMiddleware, attachLocationScope, ticketController.startWork);
router.post('/:id/pause-work', authMiddleware, attachLocationScope, ticketController.pauseWork);
router.post('/:id/spare-parts', authMiddleware, attachLocationScope, ticketController.requestSpareParts);
router.post('/:id/escalate', authMiddleware, attachLocationScope, ticketController.escalateTicket);
router.post('/:id/resolve', authMiddleware, attachLocationScope, ticketController.resolveTicket);
router.get('/:id/history', authMiddleware, attachLocationScope, ticketController.getTicketHistory);
router.put('/:id', authMiddleware, attachLocationScope, ticketController.updateTicket);
router.delete('/:id', authMiddleware, attachLocationScope, ticketController.deleteTicket);

module.exports = router;
