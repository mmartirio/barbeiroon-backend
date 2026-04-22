const { Op } = require('sequelize');
const Service = require('../models/Service');
const sequelize = require('../config/db');

class ServiceService {
    static #hasAtivoColumnCache = null;

    static normalizeServiceOutput(service) {
        if (!service) return service;

        const raw = typeof service.get === 'function'
            ? service.get({ plain: true })
            : { ...service };

        if (Object.prototype.hasOwnProperty.call(raw, 'ativo')) {
            const normalized = ServiceService.normalizeAtivo(raw.ativo);
            raw.ativo = normalized !== undefined ? normalized : true;
        }

        return raw;
    }

    static async hasAtivoColumn() {
        if (ServiceService.#hasAtivoColumnCache !== null) {
            return ServiceService.#hasAtivoColumnCache;
        }

        try {
            const queryInterface = sequelize.getQueryInterface();
            const description = await queryInterface.describeTable('service');
            ServiceService.#hasAtivoColumnCache = Boolean(description?.ativo);
        } catch (error) {
            // Se falhar ao descrever tabela, segue sem bloquear cadastro.
            ServiceService.#hasAtivoColumnCache = false;
        }

        return ServiceService.#hasAtivoColumnCache;
    }

    static normalizeAtivo(value) {
        if (value === undefined || value === null) return undefined;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value === 1;

        const text = String(value).trim().toLowerCase();
        if (['true', '1', 'sim', 'yes', 'on'].includes(text)) return true;
        if (['false', '0', 'nao', 'não', 'no', 'off'].includes(text)) return false;
        return undefined;
    }

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
    static async getAll({ tenantId, page = 1, limit = 10, onlyActive = false }) {
        const offset = (page - 1) * limit;
        const hasAtivoColumn = await ServiceService.hasAtivoColumn();
        const { rows, count } = await Service.findAndCountAll({
            attributes: hasAtivoColumn ? undefined : { exclude: ['ativo'] },
            where: {
                tenantId,
                ...(onlyActive && hasAtivoColumn ? { ativo: true } : {}),
            },
            offset,
            limit,
            order: [['id', 'DESC']]
        });
        return {
            services: rows.map((service) => ServiceService.normalizeServiceOutput(service)),
            total: count,
            page,
            limit
        };
    }

    static async create(data, tenantId) {
        const duration = ServiceService.normalizeDuration(data.duration ?? data.duracao);
        if (!duration) {
            throw new Error('Duracao obrigatoria');
        }

        const hasAtivoColumn = await ServiceService.hasAtivoColumn();
        const ativo = ServiceService.normalizeAtivo(data.ativo);

        const payload = {
            ...data,
            duration,
            tenantId,
        };

        if (hasAtivoColumn) {
            payload.ativo = ativo !== undefined ? ativo : true;
        }

        const fields = ['name', 'price', 'duration', 'description', 'tenantId', 'cliente'];
        if (hasAtivoColumn) {
            fields.push('ativo');
        }

        const created = await Service.create(payload, { fields });
        return ServiceService.normalizeServiceOutput(created);
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

        const hasAtivoColumn = await ServiceService.hasAtivoColumn();
        const ativo = ServiceService.normalizeAtivo(data.ativo);

        const payload = {
            ...data,
            ...(duration !== undefined ? { duration } : {}),
            ...(hasAtivoColumn && ativo !== undefined ? { ativo } : {})
        };

        if (!hasAtivoColumn && Object.prototype.hasOwnProperty.call(payload, 'ativo')) {
            delete payload.ativo;
        }

        await Service.update(payload, { where: { id, tenantId } });
        const updated = await Service.findOne({
            attributes: hasAtivoColumn ? undefined : { exclude: ['ativo'] },
            where: { id, tenantId }
        });
        return ServiceService.normalizeServiceOutput(updated);
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
