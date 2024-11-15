const bcrypt = require('bcrypt');
const User = require('../models/User'); // Verifique se o caminho do modelo está correto

// Função para obter todos os usuários
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll(); // Buscar todos os usuários
        res.status(200).json(users);
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        res.status(500).json({ message: 'Erro ao carregar usuários' });
    }
};

// Função para registrar um novo usuário
exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        
        // Verificar se o email já existe no banco
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email já cadastrado' });
        }

        // Criptografar a senha
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = await User.create({ name, email, password: hashedPassword, role });

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
        console.log("ID do usuário a ser excluído:", id);

        const deleted = await User.destroy({ where: { id } });
        console.log("Resultado da exclusão:", deleted);

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
        const [updated] = await User.update(
            { name, email, role },
            { where: { id } }
        );

        if (!updated) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        const updatedUser = await User.findByPk(id); // Obtenha o usuário atualizado
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Erro ao editar usuário:', error);
        res.status(500).json({ message: 'Erro ao editar usuário' });
    }
};

