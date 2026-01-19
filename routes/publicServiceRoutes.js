const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');

// Rota pública para listar serviços (usado no portal do cliente)
router.get('/:tenantId', serviceController.getAllPublic);

module.exports = router;