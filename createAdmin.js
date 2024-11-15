const sequelize = require('./config/db'); // Ajuste o caminho conforme necessário
const User = require('./models/User'); // Ajuste o caminho conforme necessário

async function createAdmin() {
    try {
        const adminUser = await User.create({
            name: 'Admin', // Nome do administrador
            email: 'admin@meubarbeiro.com', // E-mail do administrador
            password: 'admin@123', // Use uma senha segura
            role: 'admin', // Tipo do usuário
        });
        console.log('Admin user created:', adminUser.toJSON());
    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        await sequelize.close(); // Feche a conexão com o banco de dados
    }
}

createAdmin();
