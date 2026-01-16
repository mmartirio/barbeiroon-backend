const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// Rota pública para portal do cliente (sem autenticação)
// Busca ou cria cliente pelo telefone
router.post('/get-or-create', customerController.getOrCreateCustomer);

module.exports = router;
