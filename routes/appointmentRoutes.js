const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { checkPermission } = require('../middlewares/checkPermission');

router.get('/pending-promotions', appointmentController.checkPendingPromotions);
router.get('/promotion-check', appointmentController.checkPromotionUsage);
router.get('/', checkPermission('canViewAppointments'), appointmentController.getAll);
router.get('/all-grouped', checkPermission('canViewAppointments'), appointmentController.getAllGroupedByDate);
router.get('/own', appointmentController.getOwn);
router.get('/own/completed', appointmentController.getCompletedOwn);
router.get('/requests/pending', checkPermission('canViewAppointments'), appointmentController.listPendingRequests);
router.get('/requests/pending/own', appointmentController.listPendingRequestsOwn);
router.post('/', checkPermission('canCreateAppointment'), appointmentController.create);
router.put('/:id', checkPermission('canEditAppointment'), appointmentController.update);
router.delete('/:id', checkPermission('canDeleteAppointment'), appointmentController.delete);
router.post('/own/:id/cancel', appointmentController.cancelOwn);
router.post('/own/:id/close', appointmentController.closeOwn);
router.put('/own/:id/cancel', appointmentController.cancelOwn);
router.put('/own/:id/close', appointmentController.closeOwn);
router.post('/requests/:id/approve', appointmentController.approveRequest);
router.post('/requests/:id/reject', appointmentController.rejectRequest);

module.exports = router;
