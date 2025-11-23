const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

// Controlador de Login Multi-Tenant
exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        // Busca o usuário pelo e-mail, garantindo que o campo name seja retornado
        const user = await User.findOne({ 
            where: { email }, 
            attributes: ['id', 'name', 'email', 'password', 'role', 'tenantId']
        });
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        // Busca o tenantId do usuário
        const tenantId = user.tenantId;
        if (!tenantId) {
            return res.status(400).json({ message: 'Usuário não está vinculado a um tenant.' });
        }
        // Valida a senha
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Senha incorreta.' });
        }
        // Gera o token JWT incluindo o tenantId e o nome do usuário
        const token = jwt.sign(
            { userId: user.id, name: user.name, email: user.email, role: user.role, tenantId },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '1h' }
        );
        res.json({
            message: 'Login bem-sucedido',
            user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId },
            token
        });
    } catch (error) {
        console.error('Erro ao realizar login:', error);
        res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
    }
};
