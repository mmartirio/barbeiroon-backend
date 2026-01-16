const User = require('../models/User');
const Group = require('../models/Group');
const bcrypt = require('bcrypt');

class UserService {
    static async getAllUsers({ tenantId, page = 1, limit = 10 } = {}) {
        const offset = (page - 1) * limit;
        const { rows, count } = await User.findAndCountAll({
            where: { tenantId },
            include: [{
                model: Group,
                as: 'group',
                attributes: ['id', 'name', 'description']
            }],
            offset,
            limit,
            order: [['name', 'ASC']]
        });
        return { users: rows, total: count, page, limit };
    }

    static async findByEmail(email, tenantId) {
        return await User.findOne({ 
            where: { email, tenantId },
            include: [{
                model: Group,
                as: 'group'
            }]
        });
    }

    static async findById(id, tenantId) {
        return await User.findOne({ 
            where: { id, tenantId },
            include: [{
                model: Group,
                as: 'group'
            }]
        });
    }

    static async createUser({ name, email, password, groupId, tenantId }) {
        const hashedPassword = await bcrypt.hash(password, 10);
        return await User.create({ 
            name, 
            email, 
            password: hashedPassword, 
            groupId, 
            tenantId,
            isActive: true
        });
    }

    static async deleteUser(id, tenantId) {
        return await User.destroy({ where: { id, tenantId } });
    }

    static async updateUser(id, { name, email, groupId, tenantId }) {
        await User.update({ name, email, groupId }, { where: { id, tenantId } });
        return await User.findOne({ 
            where: { id, tenantId },
            include: [{
                model: Group,
                as: 'group'
            }]
        });
    }

    static async updatePassword(id, tenantId, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        return await User.update({ password: hashedPassword }, { where: { id, tenantId } });
    }

    static async toggleUserStatus(id, tenantId) {
        const user = await User.findOne({ where: { id, tenantId } });
        if (!user) return null;
        
        user.isActive = !user.isActive;
        await user.save();
        return user;
    }
}

module.exports = UserService;
