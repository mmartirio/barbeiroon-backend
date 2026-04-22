require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');
const imagesRoutes = require('./routes/images');
const seedDefault = require('./seedDefault');
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
const promotionRoutes = require('./routes/promotionRoutes');
const publicProfessionalRoutes = require('./routes/publicProfessionalRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const User = require('./models/User');
const Group = require('./models/Group');
const Customer = require('./models/Customer');
const tenantMiddleware = require('./middlewares/tenantMiddleware');
const cacheMiddleware = require('./utils/cacheMiddleware');

const app = express();
const PORT = process.env.PORT || 3001;

// Captura exceções não tratadas
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT_EXCEPTION', err && err.stack ? err.stack : err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED_REJECTION', reason && reason.stack ? reason.stack : reason, 'promise:', promise);
});

// CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost', 'http://localhost:80', 'http://192.168.0.10:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug', 'Cache-Control']
}));

app.options('*', cors());
app.use(express.json());
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

// Rotas
app.use('/api/images', imagesRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/public/customer', publicCustomerRoutes);
app.use('/api/public/appointment', publicAppointmentRoutes);
app.use('/api/public/service', publicServiceRoutes);
app.use('/api/public/professional', publicProfessionalRoutes);

const publicPromotionRoutes = require('./routes/publicPromotionRoutes');
app.use('/api/public/promotion', publicPromotionRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Rotas com tenantMiddleware
app.use('/api/user', tenantMiddleware, userRoutes);
app.use('/api/group', tenantMiddleware, groupRoutes);
app.use('/api/customer', tenantMiddleware, customerRoutes);
app.use('/api/agenda', tenantMiddleware, agendaRoutes);
app.use('/api/service', tenantMiddleware, serviceRoutes);
app.use('/api/professional', tenantMiddleware, professionalRoutes);
app.use('/api/promotion', tenantMiddleware, promotionRoutes);
app.use('/api/appointment', tenantMiddleware, appointmentRoutes);

// CORREÇÃO: Adicionar ambas as variações da rota de relatório
app.use('/api/report', tenantMiddleware, reportRoutes);  // singular
app.use('/api/reports', tenantMiddleware, reportRoutes); // plural (para compatibilidade)

// Rota pública para listar usuários do tenant
app.use('/api/public/users', require('./routes/userRoutes'));

// Rota para deletar um usuário
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

// Healthcheck
app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'API Meu Barbeiro rodando!' });
});

// Rota de teste para diagnóstico
app.get('/api/test', (req, res) => {
    res.json({ message: 'API está funcionando!', timestamp: new Date() });
});

// Middleware de erro
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Erro interno do servidor', error: err.message });
});

// Conectar ao banco e iniciar servidor
(async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado ao MySQL com sucesso!');
        await seedDefault();
        
        // Log de todas as rotas registradas
        console.log('\n========== ROTAS REGISTRADAS ==========');
        const listRoutes = (stack, basePath = '') => {
            stack.forEach((layer) => {
                if (layer.route) {
                    const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
                    console.log(`${methods} ${basePath}${layer.route.path}`);
                } else if (layer.name === 'router' && layer.handle.stack) {
                    const routerPath = layer.regexp.source
                        .replace('\\/?(?=\\/|$)', '')
                        .replace(/\\\//g, '/')
                        .replace(/\^/g, '')
                        .replace(/\?/g, '')
                        .replace(/\(\?:\(\[\^\/\]\+\?\)\)/g, ':param');
                    listRoutes(layer.handle.stack, basePath + routerPath);
                }
            });
        };
        listRoutes(app._router.stack);
        console.log('========================================\n');
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
        });
    } catch (err) {
        console.error('❌ Erro ao conectar/sincronizar banco de dados:', err);
        process.exit(1);
    }
})();