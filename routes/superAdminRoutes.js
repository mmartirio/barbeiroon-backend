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

// Planos
router.get('/plans', ctrl.getPlans);
router.post('/plans', ctrl.createPlan);
router.put('/plans/:id', ctrl.updatePlan);
router.delete('/plans/:id', ctrl.deletePlan);

// Métodos de pagamento
router.get('/payment-methods', ctrl.getPaymentMethods);
router.post('/payment-methods', ctrl.createPaymentMethod);
router.put('/payment-methods/:id', ctrl.updatePaymentMethod);
router.delete('/payment-methods/:id', ctrl.deletePaymentMethod);

// Administradores do gestor
router.get('/admin-users', ctrl.getAdminUsers);
router.post('/admin-users', ctrl.createAdminUser);
router.put('/admin-users/:id', ctrl.updateAdminUser);
router.delete('/admin-users/:id', ctrl.deleteAdminUser);

module.exports = router;
