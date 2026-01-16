// Middleware para identificar o tenant a partir do token JWT
const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');

async function tenantMiddleware(req, res, next) {
    // Espera o token no header Authorization: Bearer <token>
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token de autenticação não fornecido.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
        if (!decoded.tenantId) {
            return res.status(403).json({ message: 'Token sem tenantId.' });
        }
        // Busca o tenant pelo ID do token
        const tenant = await Tenant.findByPk(decoded.tenantId);
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant não encontrado.' });
        }
        req.tenant = tenant;
        req.user = { 
            id: decoded.userId, 
            email: decoded.email, 
            groupId: decoded.groupId,
            tenantId: decoded.tenantId,
            permissions: decoded.permissions || {}
        };
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token inválido ou expirado.' });
    }
}

module.exports = tenantMiddleware;
