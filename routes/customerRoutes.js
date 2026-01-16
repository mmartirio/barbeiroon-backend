const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const tenantMiddleware = require('../middlewares/tenantMiddleware');
const { checkAnyPermission } = require('../middlewares/checkPermission');

// Rotas protegidas (requerem autenticação e permissões)
router.get(
    '/', 
    tenantMiddleware,
    checkAnyPermission(['canViewCustomers', 'canCreateCustomer']),
    customerController.getAllCustomers
);

router.get(
    '/:phone', 
    tenantMiddleware,
    checkAnyPermission(['canViewCustomers', 'canCreateCustomer']),
    customerController.getCustomerByPhone
);

router.post(
    '/', 
    tenantMiddleware,
    checkAnyPermission(['canCreateCustomer']),
    customerController.createCustomer
);

router.put(
    '/:phone', 
    tenantMiddleware,
    checkAnyPermission(['canEditCustomer']),
    customerController.updateCustomer
);

router.delete(
    '/:phone', 
    tenantMiddleware,
    checkAnyPermission(['canDeleteCustomer']),
    customerController.deleteCustomer
);

module.exports = router;
