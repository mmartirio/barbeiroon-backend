const sequelize = require('./config/db');
const Tenant = require('./models/Tenant');
const User = require('./models/User');
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

    // Verifica se já existe o admin padrão
    let admin = await User.findOne({ where: { email: 'admin@meubarbeiro.com', tenantId: tenant.id } });
    if (!admin) {
      const hashedPassword = await bcrypt.hash('admin@123', 10);
      admin = await User.create({
        name: 'Admin',
        email: 'admin@meubarbeiro.com',
        password: hashedPassword,
        role: 'admin',
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
