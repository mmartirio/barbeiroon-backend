const sequelize = require('./config/db');
const Tenant = require('./models/Tenant');
const User = require('./models/User');
const Group = require('./models/Group');
const bcrypt = require('bcryptjs');

async function seedDefault() {
  try {
    // Verifica se já existe o tenant padrão
    let tenant = await Tenant.findOne({ where: { slug: 'meu-barbeiro' } });
    if (!tenant) {
      tenant = await Tenant.create({
        name: 'Meu Barbeiro',
        slug: 'meu-barbeiro',
        email: 'contato@meubarbeiro.com',
      });
      console.log('Tenant padrão criado:', tenant.toJSON());
    } else {
      console.log('Tenant padrão já existe.');
    }

    // Verifica se já existe o grupo Admin
    let adminGroup = await Group.findOne({ where: { name: 'Administrador' } });
    if (!adminGroup) {
      adminGroup = await Group.create({
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
        canManageTenant: true,
      });
      console.log('Grupo Admin criado:', adminGroup.toJSON());
    } else {
      console.log('Grupo Admin já existe.');
    }

    // Verifica se já existe o admin padrão
    let admin = await User.findOne({ where: { email: 'admin@meubarbeiro.com', tenantId: tenant.id } });
    if (!admin) {
      const hashedPassword = await bcrypt.hash('admin@123', 10);
      admin = await User.create({
        name: 'Admin',
        email: 'admin@meubarbeiro.com',
        password: hashedPassword,
        groupId: adminGroup.id,
        tenantId: tenant.id,
      });
      console.log('Admin padrão criado:', admin.toJSON());
    } else {
      console.log('Admin padrão já existe.');
    }
  } catch (error) {
    console.error('Erro ao garantir tenant/admin padrão:', error);
  }
}

module.exports = seedDefault;
