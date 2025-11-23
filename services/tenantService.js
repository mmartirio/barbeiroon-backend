const Tenant = require('../models/Tenant');

class TenantService {
    static async getAll({ page = 1, limit = 10 }) {
        const offset = (page - 1) * limit;
        const { rows, count } = await Tenant.findAndCountAll({ offset, limit });
        return { tenants: rows, total: count, page, limit };
    }

    static async create(data) {
        return await Tenant.create(data);
    }

    static async delete(id) {
        return await Tenant.destroy({ where: { id } });
    }

    static async update(id, data) {
        await Tenant.update(data, { where: { id } });
        return await Tenant.findByPk(id);
    }
}

module.exports = TenantService;
