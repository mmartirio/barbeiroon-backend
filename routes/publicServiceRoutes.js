const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');

function validateTenantId(req, res, next) {
    const id = req.params.tenantId;
    if (!/^\d+$/.test(id) || Number(id) <= 0) {
        return res.status(400).json({ message: 'tenantId inválido.' });
    }
    next();
}

router.get('/:tenantId', validateTenantId, serviceController.getAllPublic);

module.exports = router;