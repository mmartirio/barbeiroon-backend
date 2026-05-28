const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Group = require('../models/Group');
const Tenant = require('../models/Tenant');

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

        // Gera o token JWT incluindo o tenantId, groupId e permissões
        const token = jwt.sign(
            { 
                userId: user.id, 
                name: user.name, 
                email: user.email, 
                groupId: user.groupId,
                tenantId,
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
        console.log('[login]', user.email, '| mustSetup:', mustSetup);

        res.json({
            message: 'Login bem-sucedido',
            mustSetup,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                groupId: user.groupId,
                groupName: user.group?.name,
                tenantId,
                permissions: user.group
            },
            token
        });
    } catch (error) {
        console.error('Erro ao realizar login:', error);
        res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
    }
};
