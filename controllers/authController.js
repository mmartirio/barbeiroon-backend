const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Group = require('../models/Group');
const Tenant = require('../models/Tenant');
const emailService = require('../services/emailService');

// Controlador de Login Multi-Tenant para usuários internos
exports.login = async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }
    try {
        // Busca o usuário pelo e-mail com o grupo associado
        const user = await User.findOne({
            where: { email }, 
            attributes: ['id', 'name', 'email', 'password', 'groupId', 'tenantId', 'isActive'],
            include: [{
                model: Group,
                as: 'group',
                attributes: ['id', 'name', 'canCreateUser', 'canEditUser', 'canDeleteUser', 
                           'canViewUsers', 'canManageGroups', 'canViewCustomers', 'canCreateCustomer',
                           'canEditCustomer', 'canDeleteCustomer', 'canViewAppointments', 
                           'canCreateAppointment', 'canEditAppointment', 'canDeleteAppointment',
                           'canViewServices', 'canManageServices', 'canViewProfessionals', 
                           'canManageProfessionals', 'canViewAgenda', 'canManageAgenda', 
                           'canViewReports', 'canManageTenant']
            }]
        });

        if (!user) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // Verifica se o usuário está ativo
        if (!user.isActive) {
            return res.status(403).json({ message: '🚫 Seu usuário está desativado. Por favor, entre em contato com o administrador da barbearia.' });
        }

        // Busca o tenantId do usuário
        const tenantId = user.tenantId;
        if (!tenantId) {
            return res.status(400).json({ message: '⚠️ Seu usuário não está vinculado a nenhuma barbearia. Entre em contato com o suporte.' });
        }

        // Valida a senha
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: '🔒 Senha incorreta. Verifique se digitou corretamente ou clique em "Esqueci minha senha".' });
        }

        // Busca o tenant para verificar status e incluir slug no JWT
        const tenant = await Tenant.findByPk(tenantId, { attributes: ['id', 'slug', 'name', 'isActive', 'scheduledDeleteAt'] });

        if (!tenant || !tenant.isActive) {
            return res.status(403).json({
                message: '🚫 Esta conta está desativada. Entre em contato com o suporte para reativar seu acesso.',
                accountDisabled: true,
            });
        }

        const tenantSlug = tenant?.slug || null;

        // Gera o token JWT incluindo o tenantId, tenantSlug, groupId e permissões
        const token = jwt.sign(
            {
                userId: user.id,
                name: user.name,
                email: user.email,
                groupId: user.groupId,
                tenantId,
                tenantSlug,
                permissions: user.group ? {
                    canCreateUser: user.group.canCreateUser,
                    canEditUser: user.group.canEditUser,
                    canDeleteUser: user.group.canDeleteUser,
                    canViewUsers: user.group.canViewUsers,
                    canManageGroups: user.group.canManageGroups,
                    canViewCustomers: user.group.canViewCustomers,
                    canCreateCustomer: user.group.canCreateCustomer,
                    canEditCustomer: user.group.canEditCustomer,
                    canDeleteCustomer: user.group.canDeleteCustomer,
                    canViewAppointments: user.group.canViewAppointments,
                    canCreateAppointment: user.group.canCreateAppointment,
                    canEditAppointment: user.group.canEditAppointment,
                    canDeleteAppointment: user.group.canDeleteAppointment,
                    canViewServices: user.group.canViewServices,
                    canManageServices: user.group.canManageServices,
                    canViewProfessionals: user.group.canViewProfessionals,
                    canManageProfessionals: user.group.canManageProfessionals,
                    canViewAgenda: user.group.canViewAgenda,
                    canManageAgenda: user.group.canManageAgenda,
                    canViewReports: user.group.canViewReports,
                    canManageTenant: user.group.canManageTenant
                } : {}
            },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '8h' }
        );

        const mustSetup = /^cliente\..+@barbeiroon\.com$/.test(user.email);
        console.log('[login]', user.email, '| mustSetup:', mustSetup, '| slug:', tenantSlug);

        res.json({
            message: 'Login bem-sucedido',
            mustSetup,
            tenant: { id: tenantId, slug: tenantSlug, name: tenant?.name || null },
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                groupId: user.groupId,
                groupName: user.group?.name,
                tenantId,
                tenantSlug,
                permissions: user.group
            },
            token
        });
    } catch (error) {
        console.error('Erro ao realizar login:', error);
        res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
    }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'E-mail obrigatório.' });
    const OK = { message: 'Se o e-mail estiver cadastrado, você receberá o código em breve.' };
    try {
        const user = await User.findOne({ where: { email: email.toLowerCase().trim() }, attributes: ['id', 'name', 'email'] });
        if (!user) return res.json(OK);

        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
        await user.update({ resetCode: code, resetCodeExpires: expires });

        await emailService.sendPasswordResetCode({ email: user.email, name: user.name, code });
        console.log('[forgotPassword] código enviado para', user.email);
        return res.json(OK);
    } catch (err) {
        console.error('[forgotPassword]', err.message);
        res.status(500).json({ message: 'Erro interno.' });
    }
};

// POST /api/auth/verify-reset-code
exports.verifyResetCode = async (req, res) => {
    const { email, code } = req.body || {};
    if (!email || !code) return res.status(400).json({ message: 'E-mail e código obrigatórios.' });
    try {
        const user = await User.findOne({ where: { email: email.toLowerCase().trim() }, attributes: ['id', 'resetCode', 'resetCodeExpires'] });
        if (!user || !user.resetCode || user.resetCode !== String(code).trim())
            return res.status(400).json({ message: 'Código inválido.' });
        if (new Date() > new Date(user.resetCodeExpires))
            return res.status(400).json({ message: 'Código expirado. Solicite um novo.' });
        return res.json({ valid: true });
    } catch (err) {
        res.status(500).json({ message: 'Erro interno.' });
    }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
    const { email, code, newPassword } = req.body || {};
    if (!email || !code || !newPassword) return res.status(400).json({ message: 'Dados incompletos.' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'A senha deve ter no mínimo 6 caracteres.' });
    try {
        const user = await User.findOne({ where: { email: email.toLowerCase().trim() }, attributes: ['id', 'resetCode', 'resetCodeExpires'] });
        if (!user || !user.resetCode || user.resetCode !== String(code).trim())
            return res.status(400).json({ message: 'Código inválido.' });
        if (new Date() > new Date(user.resetCodeExpires))
            return res.status(400).json({ message: 'Código expirado. Solicite um novo.' });
        const hashed = await bcrypt.hash(newPassword, 10);
        await user.update({ password: hashed, resetCode: null, resetCodeExpires: null });
        console.log('[resetPassword] senha alterada para', email);
        return res.json({ message: 'Senha alterada com sucesso!' });
    } catch (err) {
        res.status(500).json({ message: 'Erro interno.' });
    }
};
