const User = require('../models/User');
const bcrypt = require('bcrypt');

class UserService {
    static async getAllUsers({ tenantId, page = 1, limit = 10 } = {}) {
        const offset = (page - 1) * limit;
        const { rows, count } = await User.findAndCountAll({
            where: { tenantId },
            offset,
            limit
        });
        return { users: rows, total: count, page, limit };
    }

    static async findByEmail(email, tenantId) {
        return await User.findOne({ where: { email, tenantId } });
    }

    static async createUser({ name, email, password, role, tenantId }) {
        const hashedPassword = await bcrypt.hash(password, 10);
        return await User.create({ name, email, password: hashedPassword, role, tenantId });
    }

    static async deleteUser(id, tenantId) {
        return await User.destroy({ where: { id, tenantId } });
    }

    static async updateUser(id, { name, email, role, tenantId }) {
        await User.update({ name, email, role }, { where: { id, tenantId } });
        return await User.findOne({ where: { id, tenantId } });
    }
}

module.exports = UserService;
