const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Group = require('../models/Group');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { QueryTypes } = require('sequelize');
const sequelize = require('../config/db');
const { getEffectiveLimits } = require('../middlewares/planLimitMiddleware');

// Retorna o plano atual do tenant com uso em tempo real
exports.getPlan = async (req, res) => {
    try {
        const tenant = req.tenant;
        const tenantId = tenant.id;
        const limits = getEffectiveLimits(tenant);

        const now = new Date();
        const [userCount, [appointmentRow]] = await Promise.all([
            User.count({ where: { tenantId, isActive: true } }),
            sequelize.query(
                `SELECT COUNT(*) AS cnt FROM appointment
                 WHERE tenant_id = :tenantId
                   AND YEAR(appointment_date) = :year
                   AND MONTH(appointment_date) = :month
                   AND status != 'cancelado'`,
                {
                    replacements: { tenantId, year: now.getFullYear(), month: now.getMonth() + 1 },
                    type: QueryTypes.SELECT,
                }
            ),
        ]);

        const appointmentCount = Number(appointmentRow?.cnt || 0);

        res.json({
            plan: tenant.plan || null,
            planType: tenant.planType,
            limits,
            usage: {
                users: {
                    current: userCount,
                    max: limits.maxUsers,
                    pct: limits.maxUsers ? Math.round((userCount / limits.maxUsers) * 100) : 0,
                },
                appointments: {
                    current: appointmentCount,
                    max: limits.maxAppointments,
                    pct: limits.maxAppointments ? Math.round((appointmentCount / limits.maxAppointments) * 100) : 0,
                    month: `${now.getMonth() + 1}/${now.getFullYear()}`,
                },
            },
        });
    } catch (error) {
        console.error('Erro ao buscar plano do tenant:', error);
        res.status(500).json({ message: 'Erro ao buscar informações do plano.' });
    }
};

exports.registerAdmin = async (req, res) => {
    try {
        // Exige autenticação e permissão
        if (!req.user || !req.user.permissions || !req.user.permissions.isAdmin) {
            return res.status(403).json({ message: 'Permissão negada. Apenas administradores podem registrar novo admin.' });
        }
        const { tenantName, tenantSlug, adminName, adminEmail, adminPassword } = req.body;
        if (!tenantName || !tenantSlug || !adminName || !adminEmail || !adminPassword) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
        }
        // Verifica se o tenant já existe
        const existingTenant = await Tenant.findOne({ where: { slug: tenantSlug } });
        if (existingTenant) {
            return res.status(409).json({ message: 'Já existe uma barbearia com esse slug.' });
        }
        // Cria o tenant
        const tenant = await Tenant.create({ name: tenantName, slug: tenantSlug });
        // Cria o grupo admin com todas permissões
        const adminGroup = await Group.create({
            name: 'Administrador',
            tenantId: tenant.id,
            canCreateUser: true,
            canEditUser: true,
            canDeleteUser: true,
            canViewUsers: true,
            canManageGroups: true,
            canViewCustomers: true,
            canCreateCustomer: true,
            canEditCustomer: true,
            canDeleteCustomer: true,
            canViewAppointments: true,
            canCreateAppointment: true,
            canEditAppointment: true,
            canDeleteAppointment: true,
            canViewServices: true,
            canManageServices: true,
            canViewProfessionals: true,
            canManageProfessionals: true,
            canViewAgenda: true,
            canManageAgenda: true,
            canViewReports: true,
            canManageTenant: true
        });
        // Cria o usuário admin
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const adminUser = await User.create({
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            groupId: adminGroup.id,
            tenantId: tenant.id,
            isActive: true
        });
        // Gera token JWT
        const token = jwt.sign({
            userId: adminUser.id,
            email: adminUser.email,
            groupId: adminGroup.id,
            tenantId: tenant.id,
            permissions: {
                canCreateUser: true,
                canEditUser: true,
                canDeleteUser: true,
                canViewUsers: true,
                canManageGroups: true,
                canViewCustomers: true,
                canCreateCustomer: true,
                canEditCustomer: true,
                canDeleteCustomer: true,
                canViewAppointments: true,
                canCreateAppointment: true,
                canEditAppointment: true,
                canDeleteAppointment: true,
                canViewServices: true,
                canManageServices: true,
                canViewProfessionals: true,
                canManageProfessionals: true,
                canViewAgenda: true,
                canManageAgenda: true,
                canViewReports: true,
                canManageTenant: true,
                isAdmin: true
            }
        }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '2h' });
        res.status(201).json({ message: 'Admin registrado com sucesso!', token });
    } catch (error) {
        console.error('Erro ao registrar admin:', error);
        res.status(500).json({ message: 'Erro ao registrar admin', error: error.message });
    }
};
// Upload de imagem de fundo (arquivo) para o tenant
exports.uploadBackgroundImage = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ message: 'Nenhum arquivo enviado' });
        }
        const tenant = await require('../models/Tenant').findByPk(id);
        if (!tenant) {
            return res.status(404).json({ message: 'Barbearia não encontrada' });
        }
        // Salva a imagem no banco (tabela Image)
        const Image = require('../models/Image');
        const image = await Image.create({
            data: req.file.buffer || require('fs').readFileSync(req.file.path),
            contentType: req.file.mimetype
        });
        // Remove arquivo físico se existir
        if (req.file.path) {
            require('fs').unlink(req.file.path, () => {});
        }
        tenant.backgroundImage = image.id;
        await tenant.save();
        res.status(200).json({ message: 'Imagem de fundo atualizada com sucesso', backgroundImage: image.id });
    } catch (error) {
        console.error('Erro ao fazer upload da imagem de fundo:', error);
        res.status(500).json({ message: 'Erro ao fazer upload da imagem de fundo' });
    }
};
// Atualiza logo e backgroundImage do tenant
exports.updateImages = async (req, res) => {
    try {
        const { id } = req.params;
        const { logo, backgroundImage } = req.body;
        const tenant = await require('../models/Tenant').findByPk(id);
        if (!tenant) {
            return res.status(404).json({ message: 'Barbearia não encontrada' });
        }
        if (logo !== undefined) tenant.logo = logo;
        if (backgroundImage !== undefined) tenant.backgroundImage = backgroundImage;
        await tenant.save();
        res.status(200).json({ message: 'Imagens atualizadas com sucesso', logo: tenant.logo, backgroundImage: tenant.backgroundImage });
    } catch (error) {
        console.error('Erro ao atualizar imagens do tenant:', error);
        res.status(500).json({ message: 'Erro ao atualizar imagens do tenant' });
    }
};
// Retorna dados básicos do tenant como "config"
exports.getConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const tenant = await require('../models/Tenant').findByPk(id);
        if (!tenant) {
            return res.status(404).json({ message: 'Barbearia não encontrada' });
        }
        // Aqui você pode customizar o que é retornado como "config" do tenant
        res.status(200).json({
            id: tenant.id,
            name: tenant.name || '',
            slug: tenant.slug || '',
            email: tenant.email || '',
            logo: tenant.logo || '',
            backgroundImage: tenant.backgroundImage || ''
        });
    } catch (error) {
        console.error('Erro ao buscar config do tenant:', error);
        res.status(500).json({ message: 'Erro ao buscar config do tenant' });
    }
};
const TenantService = require('../services/tenantService');
const TenantOnboardingService = require('../services/tenantOnboardingService');

/**
 * Endpoint público para registro completo de barbearia
 * Cria tenant + grupos + usuário admin em uma operação
 */
exports.register = async (req, res) => {
    try {
        const result = await TenantOnboardingService.onboardTenant(req.body);
        
        res.status(201).json({
            message: 'Barbearia cadastrada com sucesso!',
            ...result
        });
    } catch (error) {
        console.error('Erro ao registrar barbearia:', error);
        res.status(400).json({ 
            message: error.message || 'Não foi possível completar o cadastro da barbearia. Por favor, verifique os dados e tente novamente' 
        });
    }
};

/**
 * Buscar barbearia por slug (público)
 */
exports.getBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const tenant = await TenantOnboardingService.getTenantBySlug(slug);
        
        if (!tenant) {
            return res.status(404).json({ message: 'Barbearia não encontrada. Verifique se o link está correto' });
        }

        res.status(200).json(tenant);
    } catch (error) {
        console.error('Erro ao buscar barbearia:', error);
        res.status(500).json({ message: 'Não foi possível carregar os dados da barbearia. Tente novamente em alguns instantes' });
    }
};

/**
 * Atualizar dados da barbearia (requer autenticação e permissão)
 */
exports.updateTenant = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const userId = req.user.id;

        const tenant = await TenantOnboardingService.updateTenant(tenantId, req.body, userId);

        res.status(200).json({
            message: 'Dados da barbearia atualizados com sucesso',
            tenant
        });
    } catch (error) {
        console.error('Erro ao atualizar barbearia:', error);
        res.status(400).json({ 
            message: error.message || 'Não foi possível atualizar os dados da barbearia. Verifique as informações e tente novamente' 
        });
    }
};

/**
 * Buscar configurações da barbearia (requer autenticação)
 */
exports.getSettings = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const Tenant = require('../models/Tenant');
        
        const tenant = await Tenant.findByPk(tenantId, {
            attributes: [
                'id', 'name', 'companyName', 'cnpj', 'slug', 'email', 'phone',
                'address', 'neighborhood', 'city', 'state', 'zipCode',
                'ownerName', 'ownerPhone', 'logo', 'backgroundImage', 'planType'
            ]
        });

        if (!tenant) {
            return res.status(404).json({ message: 'Não foi possível encontrar sua barbearia. Por favor, faça login novamente' });
        }

        res.status(200).json(tenant);
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        res.status(500).json({ message: 'Não foi possível carregar as configurações. Tente novamente' });
    }
};

/**
 * Upload de logo e background da barbearia
 */
exports.uploadAssets = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const Tenant = require('../models/Tenant');
        
        const tenant = await Tenant.findByPk(tenantId);
        if (!tenant) {
            return res.status(404).json({ message: 'Não foi possível encontrar sua barbearia' });
        }

        const updateData = {};

        // Se logo foi enviada
        if (req.files && req.files.logo && req.files.logo[0]) {
            const logoPath = `/uploads/${req.files.logo[0].filename}`;
            updateData.logo = logoPath;
        }

        // Se background foi enviado
        if (req.files && req.files.background && req.files.background[0]) {
            const backgroundPath = `/uploads/${req.files.background[0].filename}`;
            updateData.backgroundImage = backgroundPath;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'Por favor, selecione pelo menos um arquivo (logo ou plano de fundo) para enviar' });
        }

        await tenant.update(updateData);

        res.status(200).json({
            message: 'Arquivos enviados com sucesso!',
            logo: tenant.logo,
            backgroundImage: tenant.backgroundImage
        });
    } catch (error) {
        console.error('Erro ao fazer upload:', error);
        res.status(500).json({ message: 'Não foi possível fazer o upload dos arquivos. Verifique o tamanho e formato das imagens' });
    }
};

exports.getAll = async (req, res) => {
    try {
        // Se X-Tenant-Slug header presente, validar formato
        const slug = req.headers['x-tenant-slug'];
        if (slug !== undefined) {
            if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
                return res.status(400).json({ message: 'Slug inválido.' });
            }
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await TenantService.getAll({ page, limit });
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao carregar barbearias:', error);
        res.status(500).json({ message: 'Erro ao carregar barbearias' });
    }
};

exports.create = async (req, res) => {
    try {
        const { name, email } = req.body || {};
        if (!name || !email) {
            return res.status(400).json({ message: 'Nome e email são obrigatórios.' });
        }
        const stripHtml = (s) => typeof s === 'string' ? s.replace(/<[^>]*>/g, '').trim() : s;
        const sanitized = { ...req.body, name: stripHtml(name) };
        const tenant = await TenantService.create(sanitized);
        res.status(201).json(tenant);
    } catch (error) {
        console.error('Erro ao criar barbearia:', error);
        res.status(400).json({ message: error.message || 'Erro ao criar barbearia' });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await TenantService.delete(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Barbearia não encontrada' });
        }
        res.status(200).json({ message: 'Barbearia removida com sucesso' });
    } catch (error) {
        console.error('Erro ao remover barbearia:', error);
        res.status(500).json({ message: 'Erro ao remover barbearia' });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await TenantService.update(id, req.body);
        if (!updated) {
            return res.status(404).json({ message: 'Barbearia não encontrada' });
        }
        res.status(200).json(updated);
    } catch (error) {
        console.error('Erro ao editar barbearia:', error);
        res.status(500).json({ message: 'Erro ao editar barbearia' });
    }
};
