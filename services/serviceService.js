const { Op } = require('sequelize');
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

    static async getMonthlyRevenue(tenantId, year) {
        const start = new Date(year, 0, 1);
        const end = new Date(year + 1, 0, 1);
        const services = await Service.findAll({
            where: {
                tenantId,
                data: { [Op.gte]: start, [Op.lt]: end }
            },
            attributes: ['data', 'valor'],
            raw: true
        });
        // Agrupa por mês
        const months = Array(12).fill(0);
        services.forEach(s => {
            const month = new Date(s.data).getMonth();
            months[month] += s.valor;
        });
        return months;
    }
}

module.exports = ServiceService;
