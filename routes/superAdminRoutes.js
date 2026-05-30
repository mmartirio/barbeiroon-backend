const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/superAdminController');
const auth = require('../middlewares/superAdminMiddleware');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

// Login público
router.post('/login', loginLimiter, ctrl.login);

// Todas as rotas abaixo exigem token de superadmin
router.use(auth);

// Dashboard
router.get('/dashboard', ctrl.getDashboard);

// Barbearias (Tenants)
router.get('/tenants', ctrl.getTenants);
router.get('/tenants/:id', ctrl.getTenantById);
router.post('/tenants', ctrl.createTenant);
router.put('/tenants/:id', ctrl.updateTenant);
router.delete('/tenants/:id', ctrl.deleteTenant);
router.post('/tenants/:id/bootstrap', ctrl.regenerateBootstrap);

// Planos
router.get('/plans', ctrl.getPlans);
router.post('/plans', ctrl.createPlan);
router.put('/plans/:id', ctrl.updatePlan);
router.delete('/plans/:id', ctrl.deletePlan);

// Monitoramento de empresas
router.get('/tenants/:id/metrics', ctrl.getTenantMetrics);
router.get('/monitor', ctrl.getMonitor);

// Administradores do gestor
router.get('/admin-users', ctrl.getAdminUsers);
router.post('/admin-users', ctrl.createAdminUser);
router.put('/admin-users/:id', ctrl.updateAdminUser);
router.delete('/admin-users/:id', ctrl.deleteAdminUser);

// Configuração PIX
router.get('/pix/config',  ctrl.pixGetConfig);
router.put('/pix/config',  ctrl.pixSaveConfig);

// Cobranças PIX
router.get('/pix/invoices',             ctrl.pixListInvoices);
router.post('/pix/invoices',            ctrl.pixCreateInvoice);
router.put('/pix/invoices/:id/paid',    ctrl.pixMarkPaid);
router.delete('/pix/invoices/:id',      ctrl.pixCancelInvoice);

// Suporte / Mesa de chamados
const support = require('../controllers/supportController');
router.get('/support/tickets',              support.gestorListTickets);
router.get('/support/tickets/:id',          support.gestorGetTicket);
router.patch('/support/tickets/:id/status', support.gestorUpdateStatus);
router.post('/support/tickets/:id/reply',   support.gestorReply);
router.get('/support/reports',              support.gestorReports);

module.exports = router;
