const Professional = require('../models/Professional');

class ProfessionalService {
    static async getAll({ tenantId, page = 1, limit = 10 }) {
        const offset = (page - 1) * limit;
        const { rows, count } = await Professional.findAndCountAll({
            where: { tenantId },
            offset,
            limit
        });
        return { professionals: rows, total: count, page, limit };
    }

    static async create(data, tenantId) {
        return await Professional.create({ ...data, tenantId });
    }

    static async delete(id, tenantId) {
        return await Professional.destroy({ where: { id, tenantId } });
    }

    static async update(id, data, tenantId) {
        await Professional.update(data, { where: { id, tenantId } });
        return await Professional.findOne({ where: { id, tenantId } });
    }
}

module.exports = ProfessionalService;
