const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Op, QueryTypes } = require('sequelize');
const sequelize = require('../config/db');
const Tenant = require('../models/Tenant');
const Plan = require('../models/Plan');
const PaymentMethod = require('../models/PaymentMethod');
const GestorAdmin = require('../models/GestorAdmin');
const PixConfig  = require('../models/PixConfig');
const PixInvoice = require('../models/PixInvoice');
const { generatePixEMV } = require('../utils/pixGenerator');

const SECRET = process.env.JWT_SECRET || 'meu-barbeiro-secret';

// ─── Auth ─────────────────────────────────────────────────────────────────────

exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    const admin = await GestorAdmin.findOne({ where: { email } });
    if (!admin) return res.status(401).json({ message: 'Credenciais inválidas.' });
    if (!admin.isActive) return res.status(401).json({ message: 'Usuário desativado. Contate o administrador.' });

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ message: 'Credenciais inválidas.' });

    const token = jwt.sign(
        { role: 'superadmin', email: admin.email, adminId: admin.id },
        SECRET,
        { expiresIn: '8h' }
    );
    res.json({ token, mustSetup: admin.mustSetup });
};

// ─── Admin Users ──────────────────────────────────────────────────────────────

exports.getAdminUsers = async (req, res) => {
    try {
        const admins = await GestorAdmin.findAll({
            attributes: ['id', 'name', 'email', 'isActive', 'isBootstrap', 'createdAt'],
            order: [['createdAt', 'ASC']],
        });
        res.json({ admins });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar administradores.' });
    }
};

exports.createAdminUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Senha deve ter pelo menos 6 caracteres.' });
        }

        const exists = await GestorAdmin.findOne({ where: { email } });
        if (exists) return res.status(409).json({ message: 'Email já cadastrado.' });

        const hashed = await bcrypt.hash(password, 10);
        const admin = await GestorAdmin.create({
            name, email, password: hashed, isActive: true, isBootstrap: false, mustSetup: false,
        });

        // Desativa todos os usuários bootstrap após o primeiro admin real ser criado
        await GestorAdmin.update({ isActive: false }, { where: { isBootstrap: true } });

        res.status(201).json({ id: admin.id, name: admin.name, email: admin.email, isActive: admin.isActive });
    } catch (error) {
        console.error('Erro ao criar admin:', error);
        res.status(500).json({ message: 'Erro ao criar administrador.' });
    }
};

exports.updateAdminUser = async (req, res) => {
    try {
        const admin = await GestorAdmin.findByPk(req.params.id);
        if (!admin) return res.status(404).json({ message: 'Administrador não encontrado.' });

        const { name, email, password, isActive } = req.body;
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (email !== undefined) updates.email = email;
        if (password) updates.password = await bcrypt.hash(password, 10);
        if (isActive !== undefined) updates.isActive = isActive;

        // Impede desativar o último admin ativo
        if (isActive === false) {
            const activeCount = await GestorAdmin.count({
                where: { isActive: true, id: { [Op.ne]: admin.id } },
            });
            if (activeCount === 0) {
                return res.status(400).json({ message: 'Não é possível desativar o único administrador ativo.' });
            }
        }

        await admin.update(updates);
        res.json({ id: admin.id, name: admin.name, email: admin.email, isActive: admin.isActive });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar administrador.' });
    }
};

exports.deleteAdminUser = async (req, res) => {
    try {
        const admin = await GestorAdmin.findByPk(req.params.id);
        if (!admin) return res.status(404).json({ message: 'Administrador não encontrado.' });

        const activeCount = await GestorAdmin.count({
            where: { isActive: true, id: { [Op.ne]: admin.id } },
        });
        if (activeCount === 0) {
            return res.status(400).json({ message: 'Não é possível excluir o único administrador ativo.' });
        }

        await admin.destroy();
        res.json({ message: 'Administrador excluído com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir administrador.' });
    }
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

exports.getDashboard = async (req, res) => {
    try {
        const [totalTenants, activeTenants, totalPlans, totalPaymentMethods] = await Promise.all([
            Tenant.count(),
            Tenant.count({ where: { isActive: true } }),
            Plan.count({ where: { isActive: true } }),
            PaymentMethod.count({ where: { isActive: true } }),
        ]);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newTenants = await Tenant.count({ where: { createdAt: { [Op.gte]: thirtyDaysAgo } } });

        const planDistribution = await Tenant.findAll({
            attributes: ['planType', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['planType'],
            raw: true,
        });

        const recentTenants = await Tenant.findAll({
            order: [['createdAt', 'DESC']],
            limit: 5,
            attributes: ['id', 'name', 'email', 'planType', 'isActive', 'createdAt'],
        });

        res.json({
            stats: {
                totalTenants, activeTenants,
                inactiveTenants: totalTenants - activeTenants,
                newTenants, totalPlans, totalPaymentMethods,
            },
            planDistribution,
            recentTenants,
        });
    } catch (error) {
        console.error('Erro no dashboard gestor:', error);
        res.status(500).json({ message: 'Erro ao carregar dashboard.' });
    }
};

// ─── Tenants ──────────────────────────────────────────────────────────────────

exports.getTenants = async (req, res) => {
    try {
        const { search, status, planType, page = 1, limit = 20 } = req.query;
        const where = {};
        if (search) {
            where[Op.or] = [
                { name:  { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { cnpj:  { [Op.like]: `%${search}%` } },
            ];
        }
        if (status === 'active')   where.isActive = true;
        if (status === 'inactive') where.isActive = false;
        if (planType) where.planType = planType;

        const { rows, count } = await Tenant.findAndCountAll({
            where,
            include: [{ model: Plan, as: 'plan', required: false, attributes: ['id', 'name', 'isActive'] }],
            order: [['createdAt', 'DESC']],
            limit: Number(limit),
            offset: (Number(page) - 1) * Number(limit),
        });
        res.json({ tenants: rows, total: count, page: Number(page), limit: Number(limit) });
    } catch (error) {
        console.error('Erro ao listar tenants:', error);
        res.status(500).json({ message: 'Erro ao listar empresas.' });
    }
};

exports.getTenantById = async (req, res) => {
    try {
        const tenant = await Tenant.findByPk(req.params.id, {
            include: [{ model: Plan, as: 'plan', required: false }],
        });
        if (!tenant) return res.status(404).json({ message: 'Empresa não encontrada.' });
        res.json(tenant);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar empresa.' });
    }
};

const _stripHtml = (s) => typeof s === 'string' ? s.replace(/<[^>]*>/g, '').trim() : s;

exports.createTenant = async (req, res) => {
    try {
        let { name, companyName, cnpj, slug, email, phone, address, neighborhood, city, state, zipCode,
            ownerName, ownerEmail, ownerPhone, planType, isActive } = req.body;

        if (!name || !slug || !email) {
            return res.status(400).json({ message: 'Nome, slug e email são obrigatórios.' });
        }

        // Valida formato do slug
        if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(slug)) {
            return res.status(400).json({ message: 'Slug inválido. Use apenas letras minúsculas, números e hífens.' });
        }

        // Sanitiza campos de texto (previne XSS stored)
        name        = _stripHtml(name);
        companyName = _stripHtml(companyName);
        ownerName   = _stripHtml(ownerName);

        // Valida campo state (máx 2 chars para sigla UF)
        if (state && typeof state === 'string' && state.length > 2) {
            return res.status(400).json({ message: 'Campo estado deve ter no máximo 2 caracteres (ex: SP, RJ).' });
        }

        const exists = await Tenant.findOne({
            where: { [Op.or]: [{ slug }, ...(cnpj ? [{ cnpj }] : [])] },
        });
        if (exists) return res.status(409).json({ message: 'Slug ou CNPJ já cadastrado.' });

        const tenant = await Tenant.create({
            name, companyName, cnpj, slug, email, phone, address, neighborhood, city, state, zipCode,
            ownerName, ownerEmail, ownerPhone, planType: planType || 'free', isActive: isActive !== false,
        });
        res.status(201).json(tenant);
    } catch (error) {
        console.error('Erro ao criar tenant:', error);
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: error.errors?.[0]?.message || 'Dados inválidos.' });
        }
        res.status(500).json({ message: 'Erro ao criar empresa.' });
    }
};

exports.updateTenant = async (req, res) => {
    try {
        const tenant = await Tenant.findByPk(req.params.id);
        if (!tenant) return res.status(404).json({ message: 'Empresa não encontrada.' });

        const updates = { ...req.body };

        // Validar e vincular planId
        if (updates.planId !== undefined) {
            if (updates.planId) {
                const plan = await Plan.findByPk(updates.planId);
                if (!plan) return res.status(404).json({ message: 'Plano não encontrado.' });
                if (!plan.isActive) return res.status(400).json({ message: 'Plano selecionado está inativo.' });
            } else {
                updates.planId = null;
            }
        }

        await tenant.update(updates);

        const updated = await Tenant.findByPk(tenant.id, {
            include: [{ model: Plan, as: 'plan', required: false }],
        });
        res.json(updated);
    } catch (error) {
        console.error('Erro ao atualizar tenant:', error);
        res.status(500).json({ message: 'Erro ao atualizar empresa.' });
    }
};

exports.deleteTenant = async (req, res) => {
    try {
        const tenant = await Tenant.findByPk(req.params.id);
        if (!tenant) return res.status(404).json({ message: 'Empresa não encontrada.' });
        await tenant.destroy();
        res.json({ message: 'Empresa excluída com sucesso.' });
    } catch (error) {
        console.error('Erro ao excluir tenant:', error);
        res.status(500).json({ message: 'Erro ao excluir empresa.' });
    }
};

// ─── Monitoramento ────────────────────────────────────────────────────────────

const METRICS_SQL = `
    SELECT
        t.id,
        t.name,
        t.slug,
        t.email,
        t.is_active AS isActive,
        t.plan_type AS planType,
        COALESCE(u.total, 0)    AS totalUsers,
        COALESCE(c.total, 0)    AS totalCustomers,
        COALESCE(s.total, 0)    AS totalServices,
        COALESCE(a.agendado, 0) AS appointmentsScheduled,
        COALESCE(a.concluido, 0) AS appointmentsCompleted,
        COALESCE(a.cancelado, 0) AS appointmentsCancelled,
        COALESCE(a.pendente, 0)  AS appointmentsPending,
        COALESCE(a.total, 0)     AS appointmentsTotal
    FROM tenants t
    LEFT JOIN (
        SELECT tenant_id, COUNT(*) AS total FROM user GROUP BY tenant_id
    ) u ON u.tenant_id = t.id
    LEFT JOIN (
        SELECT tenant_id, COUNT(*) AS total FROM customers GROUP BY tenant_id
    ) c ON c.tenant_id = t.id
    LEFT JOIN (
        SELECT tenant_id, COUNT(*) AS total FROM service GROUP BY tenant_id
    ) s ON s.tenant_id = t.id
    LEFT JOIN (
        SELECT
            tenant_id,
            COUNT(*) AS total,
            SUM(status = 'agendado')  AS agendado,
            SUM(status = 'concluido') AS concluido,
            SUM(status = 'cancelado') AS cancelado,
            SUM(status = 'pendente')  AS pendente
        FROM appointment GROUP BY tenant_id
    ) a ON a.tenant_id = t.id
    WHERE (:search IS NULL OR t.name LIKE :searchLike OR t.email LIKE :searchLike)
      AND (:active IS NULL OR t.is_active = :active)
    ORDER BY t.name ASC
`;

exports.getMonitor = async (req, res) => {
    try {
        const { search = '', active } = req.query;
        const rows = await sequelize.query(METRICS_SQL, {
            replacements: {
                search: search || null,
                searchLike: search ? `%${search}%` : null,
                active: active === 'true' ? 1 : active === 'false' ? 0 : null,
            },
            type: QueryTypes.SELECT,
        });
        res.json({ tenants: rows });
    } catch (error) {
        console.error('Erro no monitor:', error);
        res.status(500).json({ message: 'Erro ao carregar monitoramento.' });
    }
};

exports.getTenantMetrics = async (req, res) => {
    try {
        const { id } = req.params;
        const rows = await sequelize.query(METRICS_SQL, {
            replacements: { search: null, searchLike: null, active: null },
            type: QueryTypes.SELECT,
        });
        const tenant = rows.find(r => String(r.id) === String(id));
        if (!tenant) return res.status(404).json({ message: 'Empresa não encontrada.' });
        res.json(tenant);
    } catch (error) {
        console.error('Erro ao buscar métricas:', error);
        res.status(500).json({ message: 'Erro ao carregar métricas.' });
    }
};

// ─── Plans ────────────────────────────────────────────────────────────────────

exports.getPlans = async (req, res) => {
    try {
        const plans = await Plan.findAll({ order: [['isDefault', 'DESC'], ['sortOrder', 'ASC'], ['createdAt', 'ASC']] });
        res.json({ plans });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar planos.' });
    }
};

exports.createPlan = async (req, res) => {
    try {
        const { name, description, priceMonthly, priceAnnual, features, maxUsers, maxAppointments, isActive, isDefault, isPublic, trialMonths, sortOrder } = req.body;
        if (!name) return res.status(400).json({ message: 'Nome do plano é obrigatório.' });

        const priceM = Number(priceMonthly || 0);
        const priceA = Number(priceAnnual  || 0);
        if (priceM < 0 || priceA < 0) {
            return res.status(400).json({ message: 'Preço não pode ser negativo.' });
        }

        const plan = await Plan.create({
            name, description,
            priceMonthly: priceM,
            priceAnnual:  priceA,
            features: Array.isArray(features) ? features : [],
            maxUsers: maxUsers || null,
            maxAppointments: maxAppointments || null,
            trialMonths: trialMonths || null,
            sortOrder: sortOrder != null ? Number(sortOrder) : 99,
            isActive: isActive !== false,
            isDefault: isDefault === true,
            isPublic: isPublic !== false,
        });
        res.status(201).json(plan);
    } catch (error) {
        console.error('Erro ao criar plano:', error);
        res.status(500).json({ message: 'Erro ao criar plano.' });
    }
};

exports.updatePlan = async (req, res) => {
    try {
        const plan = await Plan.findByPk(req.params.id);
        if (!plan) return res.status(404).json({ message: 'Plano não encontrado.' });

        const { priceMonthly, priceAnnual, ...rest } = req.body;

        if (priceMonthly !== undefined && Number(priceMonthly) < 0) {
            return res.status(400).json({ message: 'Preço não pode ser negativo.' });
        }
        if (priceAnnual !== undefined && Number(priceAnnual) < 0) {
            return res.status(400).json({ message: 'Preço não pode ser negativo.' });
        }

        const updates = {
            ...rest,
            ...(priceMonthly !== undefined && { priceMonthly: Number(priceMonthly) }),
            ...(priceAnnual  !== undefined && { priceAnnual:  Number(priceAnnual)  }),
        };

        await plan.update(updates);
        res.json(plan);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar plano.' });
    }
};

exports.deletePlan = async (req, res) => {
    try {
        const plan = await Plan.findByPk(req.params.id);
        if (!plan) return res.status(404).json({ message: 'Plano não encontrado.' });
        if (plan.isDefault) return res.status(400).json({ message: 'O plano padrão não pode ser excluído.' });
        await plan.destroy();
        res.json({ message: 'Plano excluído com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir plano.' });
    }
};

// ─── Payment Methods ──────────────────────────────────────────────────────────

exports.getPaymentMethods = async (req, res) => {
    try {
        const methods = await PaymentMethod.findAll({ order: [['createdAt', 'DESC']] });
        res.json({ paymentMethods: methods });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar métodos de pagamento.' });
    }
};

exports.createPaymentMethod = async (req, res) => {
    try {
        const { type, label, config, isActive } = req.body;
        if (!type || !label) return res.status(400).json({ message: 'Tipo e label são obrigatórios.' });
        if (!['pix', 'boleto'].includes(type)) {
            return res.status(400).json({ message: 'Tipo inválido. Use: pix ou boleto.' });
        }
        const method = await PaymentMethod.create({ type, label, config: config || {}, isActive: isActive !== false });
        res.status(201).json(method);
    } catch (error) {
        console.error('Erro ao criar método de pagamento:', error);
        res.status(500).json({ message: 'Erro ao criar método de pagamento.' });
    }
};

exports.updatePaymentMethod = async (req, res) => {
    try {
        const method = await PaymentMethod.findByPk(req.params.id);
        if (!method) return res.status(404).json({ message: 'Método de pagamento não encontrado.' });
        await method.update(req.body);
        res.json(method);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar método de pagamento.' });
    }
};

exports.deletePaymentMethod = async (req, res) => {
    try {
        const method = await PaymentMethod.findByPk(req.params.id);
        if (!method) return res.status(404).json({ message: 'Método de pagamento não encontrado.' });
        await method.destroy();
        res.json({ message: 'Método de pagamento excluído com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir método de pagamento.' });
    }
};

// ─── PIX Config ───────────────────────────────────────────────────────────────

exports.pixGetConfig = async (req, res) => {
    try {
        const cfg = await PixConfig.findOne({ order: [['id', 'DESC']] });
        res.json(cfg || null);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar configuração PIX.' });
    }
};

exports.pixSaveConfig = async (req, res) => {
    try {
        const { keyType, keyValue, ownerName, city, bankName } = req.body;
        if (!keyType || !keyValue || !ownerName || !city) {
            return res.status(400).json({ message: 'Tipo de chave, chave PIX, nome e cidade são obrigatórios.' });
        }
        if (ownerName.length > 25) {
            return res.status(400).json({ message: 'Nome do titular deve ter no máximo 25 caracteres.' });
        }
        if (city.length > 15) {
            return res.status(400).json({ message: 'Cidade deve ter no máximo 15 caracteres.' });
        }
        let cfg = await PixConfig.findOne({ order: [['id', 'DESC']] });
        if (cfg) {
            await cfg.update({ keyType, keyValue, ownerName, city, bankName: bankName || null });
        } else {
            cfg = await PixConfig.create({ keyType, keyValue, ownerName, city, bankName: bankName || null });
        }
        res.json(cfg);
    } catch (error) {
        console.error('[pix] saveConfig:', error.message);
        res.status(500).json({ message: 'Erro ao salvar configuração PIX.' });
    }
};

// ─── PIX Invoices ─────────────────────────────────────────────────────────────

exports.pixListInvoices = async (req, res) => {
    try {
        const { tenantId, status, page = 1, limit = 30 } = req.query;
        const where = {};
        if (tenantId) where.tenantId = Number(tenantId);
        if (status)   where.status   = status;

        const { rows, count } = await PixInvoice.findAndCountAll({
            where,
            include: [{ model: Tenant, as: 'tenant', required: false, attributes: ['id', 'name', 'email'] }],
            order: [['createdAt', 'DESC']],
            limit:  Number(limit),
            offset: (Number(page) - 1) * Number(limit),
        });
        res.json({ invoices: rows, total: count, page: Number(page), limit: Number(limit) });
    } catch (error) {
        console.error('[pix] listInvoices:', error.message);
        res.status(500).json({ message: 'Erro ao listar cobranças.' });
    }
};

exports.pixCreateInvoice = async (req, res) => {
    try {
        const { tenantId, planType, amountCents, dueDate, description, customerName, notes } = req.body;

        if (!amountCents || Number(amountCents) < 100) {
            return res.status(400).json({ message: 'Valor mínimo é R$ 1,00.' });
        }
        if (!dueDate) {
            return res.status(400).json({ message: 'Data de vencimento é obrigatória.' });
        }

        const cfg = await PixConfig.findOne({ order: [['id', 'DESC']] });
        if (!cfg) {
            return res.status(400).json({ message: 'Configure a chave PIX antes de emitir cobranças.' });
        }

        let resolvedName = customerName || null;
        if (!resolvedName && tenantId) {
            const tenant = await Tenant.findByPk(tenantId, { attributes: ['name', 'ownerName', 'companyName'] });
            if (tenant) resolvedName = tenant.ownerName || tenant.companyName || tenant.name;
        }

        const txid   = `INV${Date.now()}`.substring(0, 25);
        const pixEmv = generatePixEMV({
            pixKey:       cfg.keyValue,
            amountCents:  Number(amountCents),
            merchantName: cfg.ownerName,
            merchantCity: cfg.city,
            txid,
            description:  description || '',
        });

        const invoice = await PixInvoice.create({
            tenantId:     tenantId || null,
            planType:     planType || 'monthly',
            status:       'PENDING',
            amountCents:  Number(amountCents),
            dueDate,
            description:  description || null,
            customerName: resolvedName,
            pixEmv,
            notes:        notes || null,
        });

        const result = await PixInvoice.findByPk(invoice.id, {
            include: [{ model: Tenant, as: 'tenant', required: false, attributes: ['id', 'name', 'email'] }],
        });
        res.status(201).json(result);
    } catch (error) {
        console.error('[pix] createInvoice:', error.message);
        res.status(500).json({ message: 'Erro ao criar cobrança.' });
    }
};

exports.pixMarkPaid = async (req, res) => {
    try {
        const invoice = await PixInvoice.findByPk(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Cobrança não encontrada.' });
        await invoice.update({ status: 'PAID', paidAt: new Date() });
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao marcar como paga.' });
    }
};

exports.pixCancelInvoice = async (req, res) => {
    try {
        const invoice = await PixInvoice.findByPk(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Cobrança não encontrada.' });
        if (invoice.status === 'PAID') return res.status(400).json({ message: 'Não é possível cancelar uma cobrança já paga.' });
        await invoice.update({ status: 'CANCELLED' });
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao cancelar cobrança.' });
    }
};
