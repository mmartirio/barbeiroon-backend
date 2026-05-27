const express = require('express');
const router = express.Router();
const professionalController = require('../controllers/professionalController');

function validateTenantId(req, res, next) {
    const id = req.params.tenantId || req.query.tenantId;
    if (!id || !/^\d+$/.test(id) || Number(id) <= 0) {
        return res.status(400).json({ message: 'tenantId inválido.' });
    }
    next();
}

router.get('/:tenantId', validateTenantId, professionalController.getAllPublic);

module.exports = router;
