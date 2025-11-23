const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

router.get('/', appointmentController.getAll);
router.post('/', appointmentController.create);
router.delete('/:id', appointmentController.delete);
router.put('/:id', appointmentController.update);

module.exports = router;
