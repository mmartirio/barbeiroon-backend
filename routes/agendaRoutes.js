const express = require('express');
const router = express.Router();
const agendaController = require('../controllers/agendaController');

// Salvar indisponibilidade
router.post('/indisponibilidade', agendaController.saveIndisponibilidade);

// Salvar encerramento antecipado
router.post('/encerramento-antecipado', agendaController.saveEncerramentoAntecipado);

module.exports = router;

