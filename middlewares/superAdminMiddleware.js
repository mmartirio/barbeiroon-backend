const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'meu-barbeiro-secret';

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token de superadmin não fornecido.' });
    }
    const token = authHeader.slice(7);
    try {
        const decoded = jwt.verify(token, SECRET);
        if (decoded.role !== 'superadmin') {
            return res.status(403).json({ message: 'Acesso restrito ao superadmin.' });
        }
        req.superadmin = decoded;
        next();
    } catch {
        return res.status(401).json({ message: 'Token inválido ou expirado.' });
    }
};
