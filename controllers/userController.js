// Rota pública: listar usuários ativos do tenant (apenas id e nome)
exports.getAllUsersPublic = async (req, res) => {
    try {
        const tenantId = req.params.tenantId;
        const users = await require('../models/User').findAll({
            where: { tenantId, isActive: true },
            attributes: ['id', 'name']
        });

        const mappedUsers = users.map((u) => {
            const plain = typeof u.get === 'function' ? u.get({ plain: true }) : u;
            return {
                ...plain,
                imageUrl: null,
            };
        });

        res.status(200).json({ users: mappedUsers });
    } catch (error) {
        console.error('Erro ao carregar usuários públicos:', error);
        res.status(500).json({ message: 'Não foi possível carregar os usuários.' });
    }
};

// Rota pública: listar barbeiros (usuários com isBarber=true) do tenant
exports.getAllBarbersPublic = async (req, res) => {
    try {
        const tenantId = req.params.tenantId;
        const users = await require('../models/User').findAll({
            where: { tenantId, isActive: true, isBarber: true },
            attributes: ['id', 'name', 'profileImageId']
        });

        const mappedUsers = users.map((u) => {
            const plain = typeof u.get === 'function' ? u.get({ plain: true }) : u;
            return {
                id: plain.id,
                name: plain.name,
                imageUrl: plain.profileImageId ? `/api/images/image/${plain.profileImageId}` : null,
            };
        });

        res.status(200).json({ users: mappedUsers });
    } catch (error) {
        console.error('Erro ao carregar barbeiros públicos:', error);
        res.status(500).json({ message: 'Não foi possível carregar os barbeiros.' });
    }
};
exports.getBarbers = async (req, res) => {
    try {
        const tenantId = req.tenant?.id;
        if (!tenantId) return res.status(400).json({ message: 'Tenant não identificado.' });

        const User = require('../models/User');

        let users = await User.findAll({
            where: { tenantId, isActive: true, isBarber: true },
            attributes: ['id', 'name'],
        });

        // Fallback: se nenhum usuário tiver isBarber=true, retorna todos os ativos
        if (users.length === 0) {
            users = await User.findAll({
                where: { tenantId, isActive: true },
                attributes: ['id', 'name'],
            });
        }

        res.status(200).json({ users: users.map(u => u.get({ plain: true })) });
    } catch (error) {
        res.status(500).json({ message: 'Não foi possível carregar os barbeiros.' });
    }
};

const UserService = require('../services/userService');
const Image = require('../models/Image');
const Professional = require('../models/Professional');

// Sincroniza usuário com isBarber=true na tabela professional
const syncBarberToProfessional = async (user, tenantId) => {
    if (!user || !tenantId) return;
    try {
        if (user.isBarber) {
            const existing = await Professional.findOne({ where: { name: user.name, tenantId } });
            if (!existing) {
                await Professional.create({ name: user.name, specialty: 'Barbeiro', tenantId });
            }
        }
    } catch (err) {
        console.error('Erro ao sincronizar barbeiro com professional:', err.message);
    }
};

const saveProfileImage = async ({ profileImageBase64, profileImageContentType }) => {
    if (!profileImageBase64) return null;

    const normalizedBase64 = String(profileImageBase64)
        .replace(/^data:image\/[a-zA-Z+.-]+;base64,/, '')
        .trim();

    if (!normalizedBase64) return null;

    const image = await Image.create({
        data: Buffer.from(normalizedBase64, 'base64'),
        contentType: profileImageContentType || 'image/jpeg',
    });

    return image.id;
};

// Função para obter todos os usuários
exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const tenantId = req.tenant.id;
        const result = await UserService.getAllUsers({ tenantId, page, limit });
        const users = (result.users || []).map(u => ({
            ...u,
            imageUrl: u.profileImageId ? `/api/images/image/${u.profileImageId}` : null,
        }));
        res.status(200).json({ ...result, users });
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        res.status(500).json({ message: '😞 Não foi possível carregar a lista de usuários. Tente novamente em alguns instantes.' });
    }
};

// Função para obter um usuário por id
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;
        const user = await UserService.findById(id, tenantId);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        res.status(500).json({ message: '😞 Não foi possível carregar o usuário.' });
    }
};

// Função para registrar um novo usuário
exports.register = async (req, res) => {
    try {
        const { name, email, password, groupId, isBarber, profileImageBase64, profileImageContentType } = req.body;
        const tenantId = req.tenant.id;

        console.log('➡️  userController.register called', { body: { name, email, groupId }, tenantId });

        if (!groupId) {
            return res.status(400).json({ message: '📝 Por favor, selecione um grupo de permissões para o usuário.' });
        }

        // Validação de senha: é obrigatória no cadastro via painel
        if (!password || password.length < 6) {
            return res.status(400).json({ message: '🔐 Por favor, informe uma senha com no mínimo 6 caracteres.' });
        }

        // Verificar limite de usuários do plano
        const { getEffectiveLimits } = require('../middlewares/planLimitMiddleware');
        const limits = getEffectiveLimits(req.tenant);
        if (limits.maxUsers !== null) {
            const User = require('../models/User');
            const userCount = await User.count({ where: { tenantId, isActive: true } });
            if (userCount >= limits.maxUsers) {
                return res.status(403).json({
                    message: `Você atingiu o limite de ${limits.maxUsers} usuário(s) do plano ${limits.planName}. Para cadastrar mais usuários, entre em contato com o suporte ou faça upgrade do seu plano.`,
                    limitReached: true,
                    limitType: 'users',
                    limit: limits.maxUsers,
                    current: userCount,
                    planName: limits.planName,
                });
            }
        }

        const existingUser = await UserService.findByEmail(email, tenantId);
        if (existingUser) {
            return res.status(400).json({ message: '✉️ Este e-mail já está sendo usado por outro usuário. Por favor, utilize um e-mail diferente.' });
        }
        const profileImageId = await saveProfileImage({ profileImageBase64, profileImageContentType });
        const newUser = await UserService.createUser({
            name,
            email,
            password,
            groupId,
            tenantId,
            isBarber,
            profileImageId,
        });
        await syncBarberToProfessional(newUser, tenantId);

        // Desativa o usuário bootstrap quando o primeiro usuário real é criado
        if (email !== 'admin@barbeiroon.com') {
            const User = require('../models/User');
            await User.update({ isActive: false }, { where: { email: 'admin@barbeiroon.com', tenantId } });
        }

        res.status(201).json({
            message: 'Usuário registrado com sucesso', 
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                groupId: newUser.groupId,
                isBarber: newUser.isBarber,
                profileImageId: newUser.profileImageId,
            }
        });
    } catch (error) {
        console.error('Erro ao registrar usuário:', error && error.stack ? error.stack : error);
        res.status(500).json({ message: '😞 Não foi possível cadastrar o usuário. Verifique se todos os dados estão corretos e tente novamente.' });
    }
};

// Função para excluir um usuário
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;
        const deleted = await UserService.deleteUser(id, tenantId);
        if (!deleted) {
            return res.status(404).json({ message: '🔍 Usuário não encontrado. Ele pode já ter sido removido.' });
        }
        res.status(200).json({ message: 'Usuário removido com sucesso' });
    } catch (error) {
        console.error('Erro ao remover usuário:', error);
        res.status(500).json({ message: '😞 Não foi possível remover o usuário. Tente novamente.', error: error.message });
    }
};

// Função para editar um usuário
exports.userEdit = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, groupId, isBarber, profileImageBase64, profileImageContentType } = req.body;
        const tenantId = req.tenant.id;

        if (email) {
            const existingUser = await UserService.findByEmail(email, tenantId);
            if (existingUser && String(existingUser.id) !== String(id)) {
                return res.status(400).json({ message: '✉️ Este e-mail já está sendo usado por outro usuário.' });
            }
        }
        const profileImageId = await saveProfileImage({ profileImageBase64, profileImageContentType });
        const updatedUser = await UserService.updateUser(id, {
            name,
            email,
            groupId,
            isBarber,
            tenantId,
            ...(profileImageId ? { profileImageId } : {}),
        });
        if (!updatedUser) {
            return res.status(404).json({ message: '🔍 Usuário não encontrado para edição.' });
        }
        await syncBarberToProfessional(updatedUser, tenantId);
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Erro ao editar usuário:', error);
        res.status(500).json({ message: '😞 Não foi possível editar o usuário. Verifique os dados e tente novamente.' });
    }
};

// Função para alterar senha de um usuário
exports.changePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        const tenantId = req.tenant.id;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'Senha deve ter no mínimo 6 caracteres' });
        }

        const updated = await UserService.updatePassword(id, tenantId, newPassword);
        if (!updated) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        res.status(200).json({ message: 'Senha alterada com sucesso' });
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        res.status(500).json({ message: 'Erro ao alterar senha' });
    }
};

// Função para ativar/desativar usuário
exports.toggleStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;

        const user = await UserService.toggleUserStatus(id, tenantId);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        res.status(200).json({ 
            message: `Usuário ${user.isActive ? 'ativado' : 'desativado'} com sucesso`,
            user 
        });
    } catch (error) {
        console.error('Erro ao alterar status do usuário:', error);
        res.status(500).json({ message: 'Erro ao alterar status do usuário' });
    }
};

