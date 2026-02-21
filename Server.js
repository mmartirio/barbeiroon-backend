
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');
const imagesRoutes = require('./routes/images');
const seedDefault = require('./seedDefault');
// const app = express();
// Rota pública para listar usuários do tenant (para o portal do cliente)


// Importar models e associações
require('./models/associations');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const groupRoutes = require('./routes/groupRoutes');
const customerRoutes = require('./routes/customerRoutes');
const publicCustomerRoutes = require('./routes/publicCustomerRoutes');
const publicAppointmentRoutes = require('./routes/publicAppointmentRoutes');
const agendaRoutes = require('./routes/agendaRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const publicServiceRoutes = require('./routes/publicServiceRoutes');
const professionalRoutes = require('./routes/professionalRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const User = require('./models/User'); // Importa o modelo de usuário
const Group = require('./models/Group'); // Importa o modelo de grupo
const Customer = require('./models/Customer'); // Importa o modelo de cliente
const tenantMiddleware = require('./middlewares/tenantMiddleware');
const cacheMiddleware = require('./utils/cacheMiddleware');

const app = express();
// Rota pública para listar usuários do tenant (para o portal do cliente)
app.use('/api/public/users', require('./routes/userRoutes'));
const PORT = process.env.PORT || 3001;

// CORS deve vir ANTES de qualquer rota
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost', 'http://localhost:80'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug', 'Cache-Control']
}));

// Permite preflight para todas as rotas
app.options('*', cors());

// Middleware para processar JSON deve vir antes das rotas
app.use(express.json());

// Servir arquivos estáticos da pasta uploads
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

// Rota para servir imagens do banco de dados
app.use('/api/images', imagesRoutes);

// Rotas públicas para cadastro e gestão de barbearias (tenants)
app.use('/api/tenant', tenantRoutes);

// Usar as rotas de autenticação e registro de usuários
app.use('/api/auth', authRoutes);


// Rotas públicas para portal do cliente (sem autenticação)
app.use('/api/public/customer', publicCustomerRoutes);
app.use('/api/public/appointment', publicAppointmentRoutes);
app.use('/api/public/service', publicServiceRoutes);

// Rotas de dashboard (admin)
app.use('/api/dashboard', dashboardRoutes);

// Cache apenas para GET de usuários
app.use('/api/user/users', tenantMiddleware, cacheMiddleware((req) => `tenant_${req.tenant.id}_users_page_${req.query.page || 1}_limit_${req.query.limit || 10}`));
app.use('/api/user', tenantMiddleware, userRoutes); // Rota principal para o CRUD de usuários
app.use('/api/group', tenantMiddleware, groupRoutes); // Rotas de grupos multi-tenant
app.use('/api/customer', tenantMiddleware, customerRoutes); // Rotas de clientes multi-tenant
app.use('/api/agenda', tenantMiddleware, agendaRoutes); // Rotas de agenda multi-tenant
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

// Middleware para capturar erros internos do servidor (deve vir no final)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Erro interno do servidor', error: err.message });
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
    // A sincronização automática está desabilitada para evitar problemas de duplicidade de índices e alterações não controladas.
    // Use apenas migrations para alterar o schema do banco de dados.
    // Caso precise criar o banco do zero, rode as migrations manualmente.
}

// Iniciar o servidor
(async () => {
    try {
        await sequelize.authenticate();
        console.log('Conexão com o banco de dados bem-sucedida!');
        await syncDatabase();
        await seedDefault();
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Servidor rodando na porta ${PORT}`);
        });
    } catch (err) {
        console.error('Erro ao conectar/sincronizar banco de dados:', err);
        process.exit(1);
    }
})();
