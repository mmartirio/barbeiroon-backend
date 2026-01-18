const express = require('express');
const router = express.Router();
const professionalController = require('../controllers/professionalController');

// Rota pública para listar profissionais (usado no portal do cliente)
router.get('/public/:tenantId', professionalController.getAllPublic);

router.get('/', professionalController.getAll);
router.post('/', professionalController.create);
router.delete('/:id', professionalController.delete);
router.put('/:id', professionalController.update);

module.exports = router;
