require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const User = require('./models/User'); // Importa o modelo de usuário

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
    origin: 'http://localhost:3000', // Permite o acesso do frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Middleware para capturar erros internos do servidor
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Erro interno do servidor', error: err.message });
});

// Usar as rotas de autenticação e registro de usuários
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes); // Rota principal para o CRUD de usuários

// Rota para registrar novo usuário com verificação de duplicidade
app.post('/api/user/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        // Verifica se o usuário já existe no banco de dados
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(500).json({ message: 'Usuário já cadastrado!' });
        }

        // Cria o novo usuário se não houver duplicidade
        const user = await User.create({ name, email, password, role });
        res.status(201).json({ message: 'Usuário adicionado com sucesso!', user });
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);

        // Retorna erro específico caso seja uma violação de chave única
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'Usuário já cadastrado!' });
        }

        res.status(500).json({ message: 'Erro ao registrar usuário', error: "Usuário já cadastrado!" });
    }
});


// Rota para deletar um usuário com Sequelize usando destroy
app.delete('/api/user/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const deletedUser = await User.destroy({ where: { id } });

        if (!deletedUser) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        res.status(200).json({ message: 'Usuário removido com sucesso' });
    } catch (error) {
        console.error('Erro ao remover usuário:', error);
        res.status(500).json({ message: 'Erro ao remover usuário', error: error.message });
    }
});

// Conectar ao MySQL usando Sequelize
const connectDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log('Conectado ao MySQL com sucesso!');
        await syncDatabase();
    } catch (error) {
        console.error('Erro ao conectar ao MySQL:', error);
        process.exit(1);
    }
};

// Sincronizar o banco de dados
async function syncDatabase() {
    try {
        await sequelize.sync({ force: false });
        console.log("Banco de dados sincronizado com sucesso");
    } catch (error) {
        console.error("Erro ao sincronizar o banco de dados:", error);
    }
}

// Iniciar o servidor
connectDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
});



