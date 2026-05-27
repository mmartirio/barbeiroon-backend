function validateTenantId(req, res, next) {
    const id = req.params.tenantId || req.query.tenantId;
    if (!id || !/^\d+$/.test(String(id)) || Number(id) <= 0 || Number(id) > 2147483647) {
        return res.status(400).json({ message: 'tenantId inválido.' });
    }
    next();
}

module.exports = validateTenantId;
