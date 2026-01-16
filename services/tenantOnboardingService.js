const sequelize = require('../config/db');
const Tenant = require('../models/Tenant');
const Group = require('../models/Group');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const emailService = require('./emailService');

/**
 * Serviço de Onboarding Completo
 * Cria tenant + grupos padrão + usuário administrador em uma transação
 */
class TenantOnboardingService {
    /**
     * Gera slug único a partir do nome
     */
    async generateSlug(name) {
        const baseSlug = name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^a-z0-9]+/g, '-')     // Substitui caracteres especiais por -
            .replace(/^-|-$/g, '');          // Remove - do início e fim

        let slug = baseSlug;
        let counter = 1;

        // Verifica se slug já existe e adiciona número se necessário
        while (await Tenant.findOne({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        return slug;
    }

    /**
     * Valida CNPJ (básico)
     */
    validateCNPJ(cnpj) {
        if (!cnpj) return true; // CNPJ é opcional
        
        // Remove formatação
        const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
        
        // Verifica se tem 14 dígitos
        if (cleanCNPJ.length !== 14) {
            return false;
        }

        // Verifica se todos os dígitos são iguais
        if (/^(\d)\1+$/.test(cleanCNPJ)) {
            return false;
        }

        return true;
    }

    /**
     * Formata CNPJ
     */
    formatCNPJ(cnpj) {
        if (!cnpj) return null;
        const clean = cnpj.replace(/[^\d]/g, '');
        return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }

    /**
     * Cria grupos padrão para o tenant
     */
    async createDefaultGroups(tenantId, transaction) {
        const groups = [];

        // Grupo Administrador
        const adminGroup = await Group.create({
            name: 'Administrador',
            description: 'Acesso total ao sistema',
            tenantId,
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
        }, { transaction });

        groups.push(adminGroup);

        // Grupo Barbeiro
        const barbeiroGroup = await Group.create({
            name: 'Barbeiro',
            description: 'Profissional que atende clientes',
            tenantId,
            canViewUsers: true,
            canViewCustomers: true,
            canCreateCustomer: true,
            canViewAppointments: true,
            canCreateAppointment: true,
            canEditAppointment: true,
            canViewServices: true,
            canViewProfessionals: true,
            canViewAgenda: true,
        }, { transaction });

        groups.push(barbeiroGroup);

        // Grupo Atendente
        const atendenteGroup = await Group.create({
            name: 'Atendente',
            description: 'Gerencia clientes e agendamentos',
            tenantId,
            canViewUsers: true,
            canViewCustomers: true,
            canCreateCustomer: true,
            canEditCustomer: true,
            canDeleteCustomer: true,
            canViewAppointments: true,
            canCreateAppointment: true,
            canEditAppointment: true,
            canDeleteAppointment: true,
            canViewServices: true,
            canViewProfessionals: true,
            canViewAgenda: true,
        }, { transaction });

        groups.push(atendenteGroup);

        return groups;
    }

    /**
     * Cria usuário administrador
     */
    async createAdminUser(tenantId, groupId, ownerData, transaction) {
        const hashedPassword = await bcrypt.hash(ownerData.password, 10);

        const adminUser = await User.create({
            name: ownerData.name,
            email: ownerData.email,
            password: hashedPassword,
            groupId,
            tenantId,
            isActive: true
        }, { transaction });

        return adminUser;
    }

    /**
     * Processo completo de onboarding
     */
    async onboardTenant(data) {
        const transaction = await sequelize.transaction();

        try {
            // Validações
            if (!data.name || !data.email) {
                throw new Error('Por favor, informe o nome fantasia e o e-mail da barbearia');
            }

            if (!data.ownerName || !data.ownerEmail || !data.ownerPassword) {
                throw new Error('Por favor, preencha todos os dados do proprietário: nome, e-mail e senha');
            }

            // Valida CNPJ se fornecido
            if (data.cnpj && !this.validateCNPJ(data.cnpj)) {
                throw new Error('O CNPJ informado não é válido. Verifique e tente novamente');
            }

            // Verifica se email já existe
            const existingTenant = await Tenant.findOne({
                where: { email: data.email }
            });

            if (existingTenant) {
                throw new Error('Este e-mail já está sendo usado por outra barbearia. Por favor, utilize um e-mail diferente');
            }

            // Verifica se email do proprietário já existe
            const existingUser = await User.findOne({
                where: { email: data.ownerEmail }
            });

            if (existingUser) {
                throw new Error('O e-mail do proprietário já está cadastrado no sistema. Use outro e-mail');
            }

            // Gera slug único
            const slug = data.slug || await this.generateSlug(data.name);

            // Formata CNPJ
            const formattedCNPJ = this.formatCNPJ(data.cnpj);

            // 1. Cria o Tenant
            const tenant = await Tenant.create({
                name: data.name,
                companyName: data.companyName,
                cnpj: formattedCNPJ,
                slug,
                email: data.email,
                phone: data.phone,
                address: data.address,
                neighborhood: data.neighborhood,
                city: data.city,
                state: data.state,
                zipCode: data.zipCode,
                ownerName: data.ownerName,
                ownerEmail: data.ownerEmail,
                ownerPhone: data.ownerPhone,
                logo: data.logo,
                backgroundImage: data.backgroundImage,
                isActive: true,
                planType: data.planType || 'free'
            }, { transaction });

            // 2. Cria os grupos padrão
            const groups = await this.createDefaultGroups(tenant.id, transaction);
            const adminGroup = groups.find(g => g.name === 'Administrador');

            // 3. Cria o usuário administrador
            const adminUser = await this.createAdminUser(
                tenant.id,
                adminGroup.id,
                {
                    name: data.ownerName,
                    email: data.ownerEmail,
                    password: data.ownerPassword
                },
                transaction
            );

            // Commit da transação
            await transaction.commit();

            // Envia e-mail de confirmação (não bloqueia o cadastro se falhar)
            const loginUrl = process.env.FRONTEND_URL 
                ? `${process.env.FRONTEND_URL}/admin/login`
                : 'http://localhost:3000/admin/login';

            try {
                await emailService.sendWelcomeEmail({
                    ownerEmail: data.ownerEmail,
                    ownerName: data.ownerName,
                    companyName: tenant.name,
                    slug: tenant.slug,
                    loginUrl
                });
                console.log('E-mail de boas-vindas enviado com sucesso');
            } catch (emailError) {
                console.error('Erro ao enviar e-mail de boas-vindas:', emailError);
                // Não bloqueia o cadastro se o e-mail falhar
            }

            return {
                tenant: {
                    id: tenant.id,
                    name: tenant.name,
                    companyName: tenant.companyName,
                    slug: tenant.slug,
                    email: tenant.email,
                    phone: tenant.phone,
                    address: tenant.address,
                    city: tenant.city,
                    state: tenant.state
                },
                groups: groups.map(g => ({
                    id: g.id,
                    name: g.name,
                    description: g.description
                })),
                adminUser: {
                    id: adminUser.id,
                    name: adminUser.name,
                    email: adminUser.email,
                    groupId: adminUser.groupId
                },
                credentials: {
                    email: adminUser.email,
                    message: 'Use esta credencial para fazer login. Verifique seu e-mail para mais informações.'
                },
                accessUrl: `/barbearia/${tenant.slug}`,
                emailSent: true // Indica que o e-mail foi enviado
            };
        } catch (error) {
            // Rollback em caso de erro
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Atualiza dados da barbearia
     */
    async updateTenant(tenantId, data, userId) {
        const tenant = await Tenant.findByPk(tenantId);
        
        if (!tenant) {
            throw new Error('Não foi possível encontrar a barbearia. Verifique se você está logado corretamente');
        }

        // Valida CNPJ se fornecido
        if (data.cnpj && !this.validateCNPJ(data.cnpj)) {
            throw new Error('O CNPJ informado não é válido. Por favor, corrija e tente novamente');
        }

        // Atualiza campos permitidos
        const updateData = {};
        
        const allowedFields = [
            'name', 'companyName', 'cnpj', 'phone', 'address', 
            'neighborhood', 'city', 'state', 'zipCode', 
            'ownerName', 'ownerPhone', 'logo', 'backgroundImage'
        ];

        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                if (field === 'cnpj' && data[field]) {
                    updateData[field] = this.formatCNPJ(data[field]);
                } else {
                    updateData[field] = data[field];
                }
            }
        });

        await tenant.update(updateData);

        return tenant;
    }

    /**
     * Lista todas as barbearias (apenas para super admin)
     */
    async listAllTenants(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        
        const { count, rows } = await Tenant.findAndCountAll({
            attributes: ['id', 'name', 'companyName', 'slug', 'email', 
                        'phone', 'city', 'state', 'isActive', 'planType', 
                        'createdAt'],
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        return {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
            tenants: rows
        };
    }

    /**
     * Busca barbearia por slug (público)
     */
    async getTenantBySlug(slug) {
        const tenant = await Tenant.findOne({
            where: { slug, isActive: true },
            attributes: ['id', 'name', 'slug', 'phone', 'address', 
                        'neighborhood', 'city', 'state', 'logo', 
                        'backgroundImage']
        });

        return tenant;
    }
}

module.exports = new TenantOnboardingService();
