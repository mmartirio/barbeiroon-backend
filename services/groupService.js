const Group = require('../models/Group');

class GroupService {
    // Buscar todos os grupos do tenant
    async getAllGroups(tenantId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const { count, rows } = await Group.findAndCountAll({
            where: { tenantId },
            limit,
            offset,
            order: [['name', 'ASC']],
        });

        return {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
            groups: rows,
        };
    }

    // Buscar grupo por ID
    async getGroupById(id, tenantId) {
        return await Group.findOne({
            where: { id, tenantId },
        });
    }

    // Criar novo grupo
    async createGroup(data) {
        return await Group.create(data);
    }

    // Atualizar grupo
    async updateGroup(id, tenantId, data) {
        const group = await this.getGroupById(id, tenantId);
        if (!group) {
            return null;
        }
        await group.update(data);
        return group;
    }

    // Deletar grupo
    async deleteGroup(id, tenantId) {
        const group = await this.getGroupById(id, tenantId);
        if (!group) {
            return false;
        }
        await group.destroy();
        return true;
    }

    // Buscar grupo por nome
    async findByName(name, tenantId) {
        return await Group.findOne({
            where: { name, tenantId },
        });
    }
}

module.exports = new GroupService();
