const User = require('../models/User');
const Group = require('../models/Group');
const bcrypt = require('bcryptjs');

class UserService {
    static async getAllUsers({ tenantId, page = 1, limit = 10 } = {}) {
        try {
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
            const users = rows.map(r => (r && typeof r.get === 'function') ? r.get({ plain: true }) : r);
            return { users, total: count, page, limit };
        } catch (error) {
            console.error('🔥 ERRO em UserService.getAllUsers:', error);
            throw error;
        }
    }

    static async findByEmail(email, tenantId) {
        console.log(`🔍 UserService.findByEmail: email=${email}, tenant=${tenantId}`);
        try {
            const user = await User.findOne({ 
                where: { email, tenantId },
                include: [{ model: Group, as: 'group' }]
            });

            console.log('   Resultado da query:', user ? 'encontrado' : 'não encontrado');

            if (!user) return null;

            try {
                const plain = typeof user.get === 'function' ? user.get({ plain: true }) : user;
                if (plain && plain.group) {
                    console.log(`   Grupo associado: ${plain.group.name} (id=${plain.group.id})`);
                }
                return plain;
            } catch (getErr) {
                console.error('💥 Erro ao converter user.get():', getErr);
                return user; // fallback: return instance to avoid crash
            }
        } catch (error) {
            console.error('💥 ERRO CRÍTICO em UserService.findByEmail:', error);
            console.error('   email:', email, 'tenantId:', tenantId);
            return null; // never throw to avoid crashing callers
        }
    }

    static async findById(id, tenantId) {
        try {
            const user = await User.findOne({ 
                where: { id, tenantId },
                include: [{ model: Group, as: 'group' }]
            });
            if (!user) return null;
            return typeof user.get === 'function' ? user.get({ plain: true }) : user;
        } catch (error) {
            console.error('💥 ERRO em UserService.findById:', error);
            return null;
        }
    }

    static async createUser({ name, email, password, groupId, tenantId }) {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = await User.create({ 
                name, email, password: hashedPassword, groupId, tenantId, isActive: true
            });
            return typeof newUser.get === 'function' ? newUser.get({ plain: true }) : newUser;
        } catch (error) {
            console.error('💥 ERRO em UserService.createUser:', error && error.stack ? error.stack : error);
            throw error;
        }
    }

    static async deleteUser(id, tenantId) {
        try {
            return await User.destroy({ where: { id, tenantId } });
        } catch (error) {
            console.error('💥 ERRO em UserService.deleteUser:', error);
            throw error;
        }
    }

    static async updateUser(id, { name, email, groupId, isBarber, tenantId }) {
        try {
            const updatePayload = {};
            if (typeof name !== 'undefined') updatePayload.name = name;
            if (typeof email !== 'undefined') updatePayload.email = email;
            if (typeof groupId !== 'undefined') updatePayload.groupId = groupId;
            if (typeof isBarber !== 'undefined') updatePayload.isBarber = isBarber;

            await User.update(updatePayload, { where: { id, tenantId } });
            const user = await User.findOne({ where: { id, tenantId }, include: [{ model: Group, as: 'group' }] });
            return user ? (typeof user.get === 'function' ? user.get({ plain: true }) : user) : null;
        } catch (error) {
            console.error('💥 ERRO em UserService.updateUser:', error);
            throw error;
        }
    }

    static async updatePassword(id, tenantId, newPassword) {
        try {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            return await User.update({ password: hashedPassword }, { where: { id, tenantId } });
        } catch (error) {
            console.error('💥 ERRO em UserService.updatePassword:', error);
            throw error;
        }
    }

    static async toggleUserStatus(id, tenantId) {
        try {
            const user = await User.findOne({ where: { id, tenantId } });
            if (!user) return null;
            user.isActive = !user.isActive;
            await user.save();
            return typeof user.get === 'function' ? user.get({ plain: true }) : user;
        } catch (error) {
            console.error('💥 ERRO em UserService.toggleUserStatus:', error);
            throw error;
        }
    }
}

module.exports = UserService;
