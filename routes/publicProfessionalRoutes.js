const express = require('express');
const router = express.Router();
const professionalController = require('../controllers/professionalController');

// Rota publica para listar profissionais (portal do cliente)
router.get('/:tenantId', professionalController.getAllPublic);

module.exports = router;
