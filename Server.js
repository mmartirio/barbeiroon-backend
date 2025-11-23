require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');

(async () => {
const imagesRoutes = require('./routes/images');

const seedDefault = require('./seedDefault');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
// const agendaRoutes = require('./routes/agendaRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const professionalRoutes = require('./routes/professionalRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const User = require('./models/User'); // Importa o modelo de usuário
const tenantMiddleware = require('./middlewares/tenantMiddleware');
const cacheMiddleware = require('./utils/cacheMiddleware');

const app = express();

// Servir arquivos estáticos da pasta uploads
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));
// Rota para servir imagens do banco de dados
app.use('/api/images', imagesRoutes);
const PORT = process.env.PORT || 3001;

// Rotas públicas para cadastro e gestão de barbearias (tenants)
app.use('/api/tenant', tenantRoutes);


app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

// Permite preflight para todas as rotas
app.options('*', cors());

app.use(express.json());

// Middleware para capturar erros internos do servidor
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Erro interno do servidor', error: err.message });
});

// Usar as rotas de autenticação e registro de usuários
app.use('/api/auth', authRoutes);
// Cache apenas para GET de usuários
app.use('/api/user/users', tenantMiddleware, cacheMiddleware((req) => `tenant_${req.tenant.id}_users_page_${req.query.page || 1}_limit_${req.query.limit || 10}`));
app.use('/api/user', tenantMiddleware, userRoutes); // Rota principal para o CRUD de usuários
// app.use('/api/agenda', tenantMiddleware, agendaRoutes); // Rotas de agenda multi-tenant
app.use('/api/service', tenantMiddleware, serviceRoutes); // Rotas de serviços multi-tenant
app.use('/api/professional', tenantMiddleware, professionalRoutes); // Rotas de profissionais multi-tenant
app.use('/api/appointment', tenantMiddleware, appointmentRoutes); // Rotas de agendamentos multi-tenant
app.use('/api/report', tenantMiddleware, reportRoutes); // Rotas de relatórios multi-tenant




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
        // Cria as tabelas que não existem e atualiza as existentes conforme os models, sem apagar dados
        await sequelize.sync({ alter: true });
        console.log("Sincronização de models concluída!");
    } catch (error) {
        console.error("Erro ao sincronizar o banco de dados:", error);
    }
}

// Iniciar o servidor



    try {
        await sequelize.authenticate();
        console.log('Conexão com o banco de dados bem-sucedida!');
        await syncDatabase();
        await seedDefault();
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
        });
    } catch (err) {
        console.error('Erro ao conectar/sincronizar banco de dados:', err);
        process.exit(1);
    }
})();



