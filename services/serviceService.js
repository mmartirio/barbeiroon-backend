const { Op } = require('sequelize');
const Service = require('../models/Service');

class ServiceService {
    static normalizeDuration(value) {
        if (value === undefined || value === null || value === '') {
            return null;
        }

        if (typeof value === 'number') {
            const totalMinutes = Math.max(0, Math.floor(value));
            const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
            const minutes = String(totalMinutes % 60).padStart(2, '0');
            return `${hours}:${minutes}:00`;
        }

        const text = String(value).trim();
        if (!text) return null;

        if (/^\d+$/.test(text)) {
            const totalMinutes = Math.max(0, parseInt(text, 10));
            const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
            const minutes = String(totalMinutes % 60).padStart(2, '0');
            return `${hours}:${minutes}:00`;
        }

        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
            const parts = text.split(':');
            const hours = parts[0].padStart(2, '0');
            const minutes = parts[1].padStart(2, '0');
            const seconds = (parts[2] || '00').padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
        }

        return null;
    }
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
        const duration = ServiceService.normalizeDuration(data.duration ?? data.duracao);
        if (!duration) {
            throw new Error('Duracao obrigatoria');
        }

        return await Service.create({
            ...data,
            duration,
            tenantId
        });
    }

    static async delete(id, tenantId) {
        return await Service.destroy({ where: { id, tenantId } });
    }

    static async update(id, data, tenantId) {
        const durationValue = data.duration ?? data.duracao;
        const duration = durationValue !== undefined ? ServiceService.normalizeDuration(durationValue) : undefined;
        if (durationValue !== undefined && !duration) {
            throw new Error('Duracao obrigatoria');
        }

        const payload = {
            ...data,
            ...(duration !== undefined ? { duration } : {})
        };

        await Service.update(payload, { where: { id, tenantId } });
        return await Service.findOne({ where: { id, tenantId } });
    }

    static async getMonthlyRevenue(tenantId, year) {
        const start = new Date(year, 0, 1);
        const end = new Date(year + 1, 0, 1);
        const services = await Service.findAll({
            where: {
                created_at: { [Op.gte]: start, [Op.lt]: end }
            },
            attributes: ['created_at', 'price'],
            raw: true
        });
        // Agrupa por mês
        const months = Array(12).fill(0);
        services.forEach(s => {
            const month = new Date(s.created_at).getMonth();
            months[month] += parseFloat(s.price || 0);
        });
        return months;
    }
}

module.exports = ServiceService;
