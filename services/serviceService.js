const Service = require('../models/Service');

class ServiceService {
    static async getAll({ tenantId, page = 1, limit = 10 }) {
        const offset = (page - 1) * limit;
        const { rows, count } = await Service.findAndCountAll({
            where: { tenantId },
            offset,
            limit
        });
        return { services: rows, total: count, page, limit };
    }

    static async create(data, tenantId) {
        return await Service.create({ ...data, tenantId });
    }

    static async delete(id, tenantId) {
        return await Service.destroy({ where: { id, tenantId } });
    }

    static async update(id, data, tenantId) {
        await Service.update(data, { where: { id, tenantId } });
        return await Service.findOne({ where: { id, tenantId } });
    }
}

module.exports = ServiceService;
