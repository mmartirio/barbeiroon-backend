const express = require('express');
const router = express.Router();
const agendaController = require('../controllers/agendaController');

// Salvar indisponibilidade
router.post('/indisponibilidade', agendaController.saveIndisponibilidade);

// Salvar encerramento antecipado
router.post('/encerramento-antecipado', agendaController.saveEncerramentoAntecipado);


// Buscar expediente de um profissional (com fallback para agenda global)
router.get('/', agendaController.getExpediente);

// Salvar expediente
router.post('/', agendaController.saveExpediente);

module.exports = router;

