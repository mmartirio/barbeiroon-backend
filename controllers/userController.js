const UserService = require('../services/userService');

// Função para obter todos os usuários
exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const tenantId = req.tenant.id;
        const result = await UserService.getAllUsers({ tenantId, page, limit });
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        res.status(500).json({ message: 'Erro ao carregar usuários' });
    }
};

// Função para registrar um novo usuário
exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const tenantId = req.tenant.id;
        const existingUser = await UserService.findByEmail(email, tenantId);
        if (existingUser) {
            return res.status(400).json({ message: 'Email já cadastrado' });
        }
        const newUser = await UserService.createUser({ name, email, password, role, tenantId });
        res.status(201).json({ 
            message: 'Usuário registrado com sucesso', 
            user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
        });
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        res.status(500).json({ message: 'Erro ao registrar usuário' });
    }
};

// Função para excluir um usuário
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;
        const deleted = await UserService.deleteUser(id, tenantId);
        if (!deleted) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        res.status(200).json({ message: 'Usuário removido com sucesso' });
    } catch (error) {
        console.error('Erro ao remover usuário:', error);
        res.status(500).json({ message: 'Erro ao remover usuário', error: error.message });
    }
};

// Função para editar um usuário
exports.userEdit = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role } = req.body;
        const tenantId = req.tenant.id;
        const updatedUser = await UserService.updateUser(id, { name, email, role, tenantId });
        if (!updatedUser) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Erro ao editar usuário:', error);
        res.status(500).json({ message: 'Erro ao editar usuário' });
    }
};

