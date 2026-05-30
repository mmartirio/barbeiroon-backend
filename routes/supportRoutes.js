const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/supportController');

// Rotas do tenant (tenantMiddleware aplicado no Server.js)
router.post('/ticket', ctrl.createTicket);
router.get('/ticket',  ctrl.listTickets);

module.exports = router;
