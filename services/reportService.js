const Report = require('../models/Report');

class ReportService {
    static async getAll({ tenantId, page = 1, limit = 10 }) {
        const offset = (page - 1) * limit;
        const { rows, count } = await Report.findAndCountAll({
            where: { tenantId },
            offset,
            limit
        });
        return { reports: rows, total: count, page, limit };
    }

    static async create(data, tenantId) {
        return await Report.create({ ...data, tenantId });
    }

    static async delete(id, tenantId) {
        return await Report.destroy({ where: { id, tenantId } });
    }

    static async update(id, data, tenantId) {
        await Report.update(data, { where: { id, tenantId } });
        return await Report.findOne({ where: { id, tenantId } });
    }
}

module.exports = ReportService;
