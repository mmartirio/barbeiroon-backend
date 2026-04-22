const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// CORREÇÃO: A ordem das rotas é importante - rotas específicas primeiro
router.get('/appointments', reportController.getAppointments);
router.get('/', reportController.getAll);
router.post('/', reportController.create);
router.put('/:id', reportController.update);
router.delete('/:id', reportController.delete);

module.exports = router;