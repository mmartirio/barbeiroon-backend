const sequelize = require('./config/db');
const Group = require('./models/Group');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

/**
 * Script para criar grupos padrão e usuário administrador inicial
 * Execute este script após criar um novo tenant para configurar os grupos básicos
 */

async function seedDefaultGroups(tenantId) {
    try {
        console.log(`Criando grupos padrão para o tenant ${tenantId}...`);

        // Grupo Administrador - Acesso total
        const adminGroup = await Group.create({
            name: 'Administrador',
            description: 'Acesso total ao sistema, pode gerenciar usuários, grupos e todas as funcionalidades',
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
        });

        console.log('✓ Grupo Administrador criado');

        // Grupo Barbeiro - Acesso a agenda, clientes e serviços
        const barbeiroGroup = await Group.create({
            name: 'Barbeiro',
            description: 'Pode visualizar agenda, clientes, serviços e criar agendamentos',
            tenantId,
            canCreateUser: false,
            canEditUser: false,
            canDeleteUser: false,
            canViewUsers: true,
            canManageGroups: false,
            canViewCustomers: true,
            canCreateCustomer: true,
            canEditCustomer: false,
            canDeleteCustomer: false,
            canViewAppointments: true,
            canCreateAppointment: true,
            canEditAppointment: true,
            canDeleteAppointment: false,
            canViewServices: true,
            canManageServices: false,
            canViewProfessionals: true,
            canManageProfessionals: false,
            canViewAgenda: true,
            canManageAgenda: false,
            canViewReports: false,
            canManageTenant: false,
        });

        console.log('✓ Grupo Barbeiro criado');

        // Grupo Atendente - Acesso a clientes e agendamentos
        const atendenteGroup = await Group.create({
            name: 'Atendente',
            description: 'Pode gerenciar clientes e agendamentos, visualizar agenda e serviços',
            tenantId,
            canCreateUser: false,
            canEditUser: false,
            canDeleteUser: false,
            canViewUsers: true,
            canManageGroups: false,
            canViewCustomers: true,
            canCreateCustomer: true,
            canEditCustomer: true,
            canDeleteCustomer: true,
            canViewAppointments: true,
            canCreateAppointment: true,
            canEditAppointment: true,
            canDeleteAppointment: true,
            canViewServices: true,
            canManageServices: false,
            canViewProfessionals: true,
            canManageProfessionals: false,
            canViewAgenda: true,
            canManageAgenda: false,
            canViewReports: false,
            canManageTenant: false,
        });

        console.log('✓ Grupo Atendente criado');

        return {
            adminGroup,
            barbeiroGroup,
            atendenteGroup
        };
    } catch (error) {
        console.error('Erro ao criar grupos padrão:', error);
        throw error;
    }
}

async function createAdminUser(tenantId, groupId, email, password, name) {
    try {
        console.log('Criando usuário administrador...');

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const adminUser = await User.create({
            name,
            email,
            password: hashedPassword,
            groupId,
            tenantId,
            isActive: true
        });

        console.log('✓ Usuário administrador criado com sucesso');
        console.log(`  Email: ${email}`);
        console.log(`  Nome: ${name}`);

        return adminUser;
    } catch (error) {
        console.error('Erro ao criar usuário administrador:', error);
        throw error;
    }
}

// Função principal
async function main() {
    try {
        await sequelize.authenticate();
        console.log('Conexão com banco de dados estabelecida.\n');

        // Substitua estes valores pelos dados do seu tenant
        const TENANT_ID = 1; // ID do tenant
        const ADMIN_EMAIL = 'admin@meubarbeiro.com';
        const ADMIN_PASSWORD = 'Admin@123';
        const ADMIN_NAME = 'Administrador';

        // Cria os grupos padrão
        const groups = await seedDefaultGroups(TENANT_ID);

        // Cria o usuário administrador
        await createAdminUser(
            TENANT_ID,
            groups.adminGroup.id,
            ADMIN_EMAIL,
            ADMIN_PASSWORD,
            ADMIN_NAME
        );

        console.log('\n✓ Configuração inicial concluída com sucesso!');
        console.log('\n=== CREDENCIAIS DO ADMINISTRADOR ===');
        console.log(`Email: ${ADMIN_EMAIL}`);
        console.log(`Senha: ${ADMIN_PASSWORD}`);
        console.log('=====================================\n');
        console.log('IMPORTANTE: Altere a senha após o primeiro login!\n');

    } catch (error) {
        console.error('Erro durante a configuração:', error);
    } finally {
        await sequelize.close();
    }
}

// Executar se for chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { seedDefaultGroups, createAdminUser };
