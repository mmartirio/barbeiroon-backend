const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { checkPermission } = require('../middlewares/checkPermission');

router.get('/', checkPermission('canViewAppointments'), appointmentController.getAll);
router.get('/all-grouped', checkPermission('canViewAppointments'), appointmentController.getAllGroupedByDate);
router.get('/own', appointmentController.getOwn);
router.post('/', checkPermission('canCreateAppointment'), appointmentController.create);
router.put('/:id', checkPermission('canEditAppointment'), appointmentController.update);
router.delete('/:id', checkPermission('canDeleteAppointment'), appointmentController.delete);
router.post('/own/:id/cancel', appointmentController.cancelOwn);
router.post('/own/:id/close', appointmentController.closeOwn);

module.exports = router;
