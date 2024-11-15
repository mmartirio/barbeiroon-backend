const express = require('express');
const bcrypt = require('bcryptjs');  // Para comparar a senha com o hash
const jwt = require('jsonwebtoken'); // Caso queira gerar um token para autenticação
const User = require('../models/User'); // Importando o modelo de usuário

const router = express.Router();

// Rota de login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Verifica se o usuário existe no banco de dados
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        // Compara a senha informada com a senha armazenada no banco
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Senha incorreta' });
        }

        // Se a autenticação for bem-sucedida, você pode gerar um token de autenticação (opcional)
        const token = jwt.sign(
            { userId: user.id, email: user.email }, 
            process.env.JWT_SECRET || 'secretkey',  // Substitua pela sua chave secreta
            { expiresIn: '1h' }  // O tempo de expiração do token
        );

        // Retorna a resposta com os dados do usuário e o token (se estiver utilizando JWT)
        res.json({
            message: 'Login bem-sucedido',
            user: { id: user.id, email: user.email, role: user.role },
            token
        });
    } catch (error) {
        console.error('Erro ao realizar login:', error);
        res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
    }
});

module.exports = router;
