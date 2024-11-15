const bcrypt = require('bcrypt');
const User = require('../models/User'); // Verifique se o caminho do modelo está correto

// Controlador de Login
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Verificar se o usuário existe
        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log(`Usuário não encontrado: ${email}`);
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        // Log do hash da senha armazenada (somente para depuração)
        console.log(`Hash da senha armazenada: ${user.password}`);

        // Verificar a senha usando bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.log(`Senha incorreta para o usuário: ${email}`);
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        // Log de sucesso na autenticação
        console.log(`Login bem-sucedido para o usuário: ${email}`);

        // Retornar resposta com informações do usuário
        res.status(200).json({
            message: 'Login realizado com sucesso',
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        });
    } catch (err) {
        console.error('Erro ao realizar login:', err);
        res.status(500).json({ message: 'Erro interno no servidor. Tente novamente mais tarde.' });
    }
};
