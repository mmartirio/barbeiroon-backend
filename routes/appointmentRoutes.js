const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { checkPermission } = require('../middlewares/checkPermission');

router.get('/', checkPermission('canViewAppointments'), appointmentController.getAll);
router.post('/', checkPermission('canCreateAppointment'), appointmentController.create);
router.put('/:id', checkPermission('canEditAppointment'), appointmentController.update);
router.delete('/:id', checkPermission('canDeleteAppointment'), appointmentController.delete);

module.exports = router;
