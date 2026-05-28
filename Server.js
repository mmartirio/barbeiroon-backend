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
const whatsappRoutes = require('./routes/whatsappRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const ReminderService = require('./services/reminderService');

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
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:5173',
    'http://localhost',
    'http://localhost:80',
    'http://192.168.0.10:3001',
    'https://barbeiroon.com',
    'https://www.barbeiroon.com',
    // Vercel — adicione a URL exata do seu projeto após o deploy
    'https://barbeiroon.vercel.app',
    // Preview deployments da Vercel
    /^https:\/\/.*\.vercel\.app$/,
];
app.use(cors({
    origin: (origin, callback) => {
        // Sem origin = server-to-server (proxy Vercel) ou app mobile (React Native)
        if (!origin) return callback(null, true);
        const allowed = ALLOWED_ORIGINS.some((o) =>
            o instanceof RegExp ? o.test(origin) : o === origin
        );
        callback(allowed ? null : new Error('CORS: origem não permitida'), allowed);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug', 'Cache-Control']
}));

app.options('*', cors());

// Remove information disclosure header
app.disable('x-powered-by');

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'self'");
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

// Limit body size to prevent DoS via large payloads (returns 413 above 200kb)
app.use(express.json({ limit: '200kb' }));
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

app.use('/api/whatsapp', whatsappRoutes);

// Public: list active plans (no auth required)
app.get('/api/public/plans', async (req, res) => {
    try {
        const Plan = require('./models/Plan');
        const plans = await Plan.findAll({
            where: { isActive: true, isPublic: true },
            attributes: ['id', 'name', 'description', 'priceMonthly', 'priceAnnual', 'features', 'maxUsers', 'trialMonths', 'sortOrder'],
            order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
        });
        res.json({ plans });
    } catch (error) {
        console.error('Erro ao listar planos públicos:', error);
        res.status(500).json({ message: 'Erro ao listar planos.' });
    }
});

app.use('/api/gestor', superAdminRoutes);

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

// Middleware de erro — trata erros de parsing, uploads e payloads grandes
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ message: 'Payload muito grande. Limite de 200kb.' });
    }
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ message: 'JSON inválido na requisição.' });
    }
    // Erros do Multer (upload de arquivo)
    const multer = require('multer');
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ message: 'Arquivo muito grande. Máximo permitido: 5 MB.' });
        }
        return res.status(400).json({ message: `Upload inválido: ${err.message}` });
    }
    // Erro de tipo de arquivo (lançado pelo fileFilter do upload.js)
    if (err && err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ message: 'Tipo de arquivo não permitido. Envie apenas imagens (JPG, PNG, GIF, WebP).' });
    }
    console.error(err.stack);
    res.status(500).json({ message: 'Erro interno do servidor' });
});

// Conectar ao banco e iniciar servidor
(async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado ao MySQL com sucesso!');

        // Cria tabelas ausentes sem alterar as existentes (seguro para primeiro deploy em Docker)
        await sequelize.sync({ force: false });
        console.log('✅ Tabelas sincronizadas');

        // Migração: adiciona colunas ausentes nas tabelas
        const columnsToAdd = [
            { table: 'appointment', column: 'status',            ddl: `ALTER TABLE appointment ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'agendado'` },
            { table: 'appointment', column: 'promotion_id',      ddl: `ALTER TABLE appointment ADD COLUMN promotion_id INT NULL` },
            { table: 'tenants',     column: 'plan_id',           ddl: `ALTER TABLE tenants ADD COLUMN plan_id INT NULL` },
            { table: 'plans',       column: 'is_default',        ddl: `ALTER TABLE plans ADD COLUMN is_default TINYINT(1) NOT NULL DEFAULT 0` },
            { table: 'plans',       column: 'trial_months',      ddl: `ALTER TABLE plans ADD COLUMN trial_months INT NULL` },
            { table: 'plans',       column: 'sort_order',        ddl: `ALTER TABLE plans ADD COLUMN sort_order INT NOT NULL DEFAULT 0` },
            { table: 'plans',       column: 'is_public',         ddl: `ALTER TABLE plans ADD COLUMN is_public TINYINT(1) NOT NULL DEFAULT 1` },
            { table: 'user',        column: 'profile_image_id',  ddl: `ALTER TABLE \`user\` ADD COLUMN \`profile_image_id\` INT NULL` },
        ];
        // Migração: remover FK incorreta de appointment.professional_id → professional
        try {
            const fkRows = await sequelize.query(
                `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointment'
                   AND COLUMN_NAME = 'professional_id' AND REFERENCED_TABLE_NAME = 'professional'`,
                { type: sequelize.constructor.QueryTypes.SELECT }
            );
            for (const row of fkRows) {
                const constraintName = row.CONSTRAINT_NAME || row.constraint_name;
                if (constraintName) {
                    await sequelize.query(`ALTER TABLE appointment DROP FOREIGN KEY \`${constraintName}\``);
                    console.log(`✅ FK incorreta '${constraintName}' removida de appointment`);
                }
            }
        } catch (e) {
            console.warn('⚠️ Migração FK appointment.professional_id:', e.message);
        }

        for (const { table, column, ddl } of columnsToAdd) {
            try {
                const [rows] = await sequelize.query(
                    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column`,
                    { replacements: { table, column }, type: sequelize.constructor.QueryTypes.SELECT }
                );
                const cnt = rows?.cnt ?? rows?.CNT ?? 0;
                if (cnt === 0) {
                    await sequelize.query(ddl);
                    console.log(`✅ Coluna '${column}' adicionada à tabela ${table}`);
                }
            } catch (e) {
                console.warn(`⚠️ Migração da coluna '${column}' em ${table}:`, e.message);
            }
        }

        // Migração: muda unique de email global para composto (email, tenant_id) em user
        try {
            const singleEmailIdx = await sequelize.query(
                `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user'
                 AND COLUMN_NAME = 'email' AND NON_UNIQUE = 0
                 GROUP BY INDEX_NAME HAVING COUNT(*) = 1`,
                { type: sequelize.constructor.QueryTypes.SELECT }
            );
            for (const row of singleEmailIdx) {
                const idxName = row.INDEX_NAME || row.index_name;
                await sequelize.query(`ALTER TABLE \`user\` DROP INDEX \`${idxName}\``);
                console.log(`✅ Índice único '${idxName}' removido de user.email`);
            }
            const [compIdx] = await sequelize.query(
                `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.STATISTICS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND INDEX_NAME = 'email_tenant_unique'`,
                { type: sequelize.constructor.QueryTypes.SELECT }
            );
            if ((compIdx?.cnt ?? compIdx?.CNT ?? 0) === 0) {
                await sequelize.query('ALTER TABLE `user` ADD UNIQUE KEY `email_tenant_unique` (`email`, `tenant_id`)');
                console.log('✅ Índice único composto (email, tenant_id) adicionado à tabela user');
            }
        } catch (e) {
            console.warn('⚠️ Migração unique email user:', e.message);
        }

        // Migração: normalizar telefones de clientes (remove não-dígitos) e eliminar duplicatas
        try {
            await sequelize.query('SET FOREIGN_KEY_CHECKS=0');
            const nonNorm = await sequelize.query(
                `SELECT phone, tenant_id, name FROM customers WHERE phone REGEXP '[^0-9]'`,
                { type: sequelize.constructor.QueryTypes.SELECT }
            );
            for (const row of nonNorm) {
                const old = row.phone || row.PHONE;
                const tid = row.tenant_id || row.TENANT_ID;
                const norm = String(old).replace(/\D/g, '');
                if (!norm) continue;
                const [dup] = await sequelize.query(
                    `SELECT COUNT(*) AS cnt FROM customers WHERE phone = :norm AND tenant_id = :tid`,
                    { replacements: { norm, tid }, type: sequelize.constructor.QueryTypes.SELECT }
                );
                const hasDup = Number(dup?.cnt ?? dup?.CNT ?? 0) > 0;
                await sequelize.query(`UPDATE appointment       SET customer_phone = :norm WHERE customer_phone = :old AND tenant_id = :tid`, { replacements: { norm, old, tid } });
                await sequelize.query(`UPDATE appointment_requests SET customer_phone = :norm WHERE customer_phone = :old AND tenant_id = :tid`, { replacements: { norm, old, tid } }).catch(() => {});
                if (hasDup) {
                    await sequelize.query(`DELETE FROM customers WHERE phone = :old AND tenant_id = :tid`, { replacements: { old, tid } });
                    console.log(`✅ Duplicata removida: "${old}" → "${norm}"`);
                } else {
                    await sequelize.query(`UPDATE customers SET phone = :norm WHERE phone = :old AND tenant_id = :tid`, { replacements: { norm, old, tid } });
                    console.log(`✅ Telefone normalizado: "${old}" → "${norm}"`);
                }
            }
            await sequelize.query('SET FOREIGN_KEY_CHECKS=1');
        } catch (e) {
            await sequelize.query('SET FOREIGN_KEY_CHECKS=1').catch(() => {});
            console.warn('⚠️ Migração normalização de telefones:', e.message);
        }

        // Cria tabelas do gestor se não existirem
        const Plan = require('./models/Plan');
        const PaymentMethod = require('./models/PaymentMethod');
        const GestorAdmin = require('./models/GestorAdmin');
        await Plan.sync({ alter: false });
        await PaymentMethod.sync({ alter: false });
        await GestorAdmin.sync({ alter: false });

        // Seed: cria ou corrige o plano Grátis padrão
        const defaultPlan = await Plan.findOne({ where: { isDefault: true } });
        if (!defaultPlan) {
            await Plan.create({
                name: 'Grátis',
                description: 'Plano gratuito com recursos básicos para começar.',
                priceMonthly: 0,
                priceAnnual: 0,
                maxUsers: 2,
                maxAppointments: 50,
                isActive: true,
                isDefault: true,
                trialMonths: 1,
                sortOrder: 0,
                features: [
                    'Agendamento pelo painel',
                    'Agendamento online por clientes',
                    'Validação de conflito de horário',
                    'Configuração de expediente',
                    'Clientes agendados por período',
                    'Cadastro de clientes',
                    'Lista e busca de clientes',
                    'Histórico do cliente',
                    'Cadastro de serviços',
                    'Lista e filtro de serviços',
                    'Notificações WhatsApp para a barbearia',
                    'Confirmação WhatsApp para o cliente',
                    'Alertas de solicitações pendentes',
                    'Múltiplos usuários e profissionais',
                    'Upload de logo e imagem de fundo',
                    'Dados da empresa editáveis',
                ],
            });
            console.log('✅ Plano Grátis (padrão) criado.');
        } else if (defaultPlan.sortOrder == null || defaultPlan.sortOrder !== 0) {
            // Corrige sort_order caso o plano já existia antes da coluna ser adicionada
            await defaultPlan.update({ sortOrder: 0 });
            console.log('✅ sort_order do plano Grátis corrigido para 0.');
        }

        const BASE_FEATURES = [
            'Agendamento pelo painel',
            'Agendamento online por clientes',
            'Validação de conflito de horário',
            'Configuração de expediente',
            'Clientes agendados por período',
            'Cadastro de clientes',
            'Lista e busca de clientes',
            'Histórico do cliente',
            'Cadastro de serviços',
            'Lista e filtro de serviços',
            'Notificações WhatsApp para a barbearia',
            'Confirmação WhatsApp para o cliente',
            'Alertas de solicitações pendentes',
            'Múltiplos usuários e profissionais',
            'Upload de logo e imagem de fundo',
            'Dados da empresa editáveis',
        ];

        // Seed: cria ou atualiza plano Básico (até 2 barbeiros)
        const basicoPlan = await Plan.findOne({ where: { name: 'Básico' } });
        if (!basicoPlan) {
            await Plan.create({
                name: 'Básico',
                description: 'Ideal para barbearias de até 2 profissionais começando a crescer.',
                priceMonthly: 29.90,
                priceAnnual: 287.00,
                maxUsers: 2,
                maxAppointments: 200,
                isActive: true,
                isDefault: false,
                trialMonths: null,
                sortOrder: 1,
                features: [...BASE_FEATURES],
            });
            console.log('✅ Plano Básico criado.');
        } else {
            await basicoPlan.update({ maxUsers: 2, sortOrder: 1 });
        }

        // Seed: cria ou atualiza plano Essencial (até 5 barbeiros)
        const essencialPlan = await Plan.findOne({ where: { name: 'Essencial' } });
        if (!essencialPlan) {
            await Plan.create({
                name: 'Essencial',
                description: 'Para barbearias em crescimento com até 5 profissionais.',
                priceMonthly: 49.90,
                priceAnnual: 479.00,
                maxUsers: 5,
                maxAppointments: 500,
                isActive: true,
                isDefault: false,
                trialMonths: null,
                sortOrder: 2,
                features: [
                    ...BASE_FEATURES,
                    'Relatórios avançados',
                    'Promoções e descontos',
                    'Grupos de permissão',
                ],
            });
            console.log('✅ Plano Essencial criado.');
        } else {
            await essencialPlan.update({ maxUsers: 5, sortOrder: 2 });
        }

        // Seed: cria ou atualiza plano Prêmio (até 8 barbeiros)
        const premioPlan = await Plan.findOne({ where: { name: 'Prêmio' } });
        if (!premioPlan) {
            await Plan.create({
                name: 'Prêmio',
                description: 'Para barbearias profissionais com até 8 profissionais e recursos completos.',
                priceMonthly: 99.90,
                priceAnnual: 959.00,
                maxUsers: 8,
                maxAppointments: null,
                isActive: true,
                isDefault: false,
                trialMonths: null,
                sortOrder: 3,
                features: [
                    ...BASE_FEATURES,
                    'Relatórios avançados',
                    'Promoções e descontos',
                    'Grupos de permissão',
                    'Agenda visual',
                    'Tela do cliente',
                ],
            });
            console.log('✅ Plano Prêmio criado.');
        } else {
            await premioPlan.update({ maxUsers: 8, sortOrder: 3 });
        }

        // Seed: cria o usuário bootstrap se não existir; reativa se estiver desativado
        const bcrypt = require('bcryptjs');
        const bootstrapAdmin = await GestorAdmin.findOne({ where: { email: 'admin@barbeiroon.com' } });
        if (!bootstrapAdmin) {
            await GestorAdmin.create({
                name: 'Admin Bootstrap',
                email: 'admin@barbeiroon.com',
                password: await bcrypt.hash('admin@123', 10),
                isBootstrap: true,
                mustSetup: true,
                isActive: true,
            });
            console.log('✅ Usuário bootstrap do gestor criado: admin@barbeiroon.com');
        } else if (!bootstrapAdmin.isActive) {
            await bootstrapAdmin.update({ isActive: true });
            console.log('✅ Usuário bootstrap do gestor reativado: admin@barbeiroon.com');
        }

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
            ReminderService.start();
        });
    } catch (err) {
        console.error('❌ Erro ao conectar/sincronizar banco de dados:', err);
        process.exit(1);
    }
})();