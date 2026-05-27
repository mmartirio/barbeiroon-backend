const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');
const Plan = require('../models/Plan');

async function tenantMiddleware(req, res, next) {
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

        const tenant = await Tenant.findByPk(decoded.tenantId, {
            include: [{ model: Plan, as: 'plan', required: false }],
        });

        if (!tenant) {
            return res.status(404).json({ message: 'Tenant não encontrado.' });
        }

        if (!tenant.isActive) {
            return res.status(403).json({ message: 'Conta da barbearia desativada. Contate o suporte.' });
        }

        // Se o tenant não tem plano vinculado, usa o plano padrão (Grátis)
        if (!tenant.plan) {
            const defaultPlan = await Plan.findOne({ where: { isDefault: true, isActive: true } });
            if (defaultPlan) tenant.plan = defaultPlan;
        }

        // Verifica se o período de uso do plano expirou
        if (tenant.plan && tenant.plan.trialMonths) {
            const start = new Date(tenant.createdAt);
            const expiry = new Date(start);
            expiry.setMonth(expiry.getMonth() + tenant.plan.trialMonths);
            if (new Date() > expiry) {
                return res.status(403).json({
                    message: `Seu período gratuito de ${tenant.plan.trialMonths} mês(es) encerrou. Entre em contato com o suporte para continuar usando o sistema.`,
                    trialExpired: true,
                    expiredAt: expiry.toISOString(),
                });
            }
        }

        req.tenant = tenant;
        req.user = {
            id:          decoded.userId,
            email:       decoded.email,
            groupId:     decoded.groupId,
            tenantId:    decoded.tenantId,
            permissions: decoded.permissions || {},
        };
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token inválido ou expirado.' });
    }
}

module.exports = tenantMiddleware;
