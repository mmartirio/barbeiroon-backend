const User = require('./models/User'); // Ajuste o caminho conforme necessário
const bcrypt = require('bcrypt');

const updateAdminPassword = async (newPassword) => {
    try {
        // Busca o usuário admin
        const adminUser = await User.findOne({ where: { role: 'admin' } });

        if (!adminUser) {
            console.error('Admin user not found');
            return;
        }

        // Hash da nova senha
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Atualiza a senha do usuário admin
        adminUser.password = hashedPassword;
        await adminUser.save();

        console.log('Admin password updated successfully');
    } catch (error) {
        console.error('Error updating admin password:', error);
    }
};

// Chame a função com a nova senha desejada
updateAdminPassword('admin@1234');
