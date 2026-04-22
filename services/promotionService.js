const Promotion = require('../models/Promotion');
const { Op } = require('sequelize');

class PromotionService {
    static async getById(id, tenantId) {
        const promotion = await Promotion.findOne({ where: { id, tenantId } });
        return promotion ? this.normalizeOutput(promotion) : null;
    }

    static async getAll({ tenantId, page = 1, limit = 20 }) {
        const offset = (page - 1) * limit;
        const { rows, count } = await Promotion.findAndCountAll({
            where: { tenantId },
            offset,
            limit,
            order: [['created_at', 'DESC']],
        });

        return {
            promotions: rows.map((item) => this.normalizeOutput(item)),
            total: count,
            page,
            limit,
        };
    }

    static async create(data, tenantId) {
        const payload = this.buildPayload(data, tenantId);
        
        if (!payload.name || Number.isNaN(payload.price) || payload.price < 0) {
            throw new Error('Dados invalidos para criar promocao.');
        }
        
        if (!payload.validFrom) {
            throw new Error('Data inicial de validade obrigatoria.');
        }
        
        if (payload.validUntil && payload.validUntil < payload.validFrom) {
            throw new Error('Data final de validade invalida.');
        }
        
        const created = await Promotion.create(payload);
        return this.normalizeOutput(created);
    }

    static async update(id, data, tenantId) {
        const current = await Promotion.findOne({ where: { id, tenantId } });
        if (!current) return null;
        
        const payload = this.buildPayload(data, tenantId, true);
        
        const hasValidFrom = data.validadeInicio !== undefined || data.validFrom !== undefined;
        const hasValidUntil = data.validadeFim !== undefined || data.validUntil !== undefined;
        
        if (hasValidFrom && !payload.validFrom) {
            throw new Error('Data inicial de validade obrigatoria.');
        }
        
        const validFromToCompare = payload.validFrom ?? current.validFrom;
        const validUntilToCompare = payload.validUntil ?? current.validUntil;
        
        if (validUntilToCompare && validFromToCompare && validUntilToCompare < validFromToCompare) {
            throw new Error('Data final de validade invalida.');
        }
        
        await Promotion.update(payload, { where: { id, tenantId } });
        const updated = await Promotion.findOne({ where: { id, tenantId } });
        return this.normalizeOutput(updated);
    }

    static async delete(id, tenantId) {
        return Promotion.destroy({ where: { id, tenantId } });
    }

    static buildPayload(data, tenantId, isUpdate = false) {
        const payload = {
            name: data.nome || data.name,
            price: Number(data.preco ?? data.price ?? 0),
            priceType: data.tipoPreco || data.priceType || 'fixo',
            discountType: data.tipo || data.discountType || 'desconto_compra',
            validFrom: data.validadeInicio || data.validFrom,
            validUntil: data.validadeFim === '' ? null : (data.validadeFim || data.validUntil || null),
            criteria: this.normalizeCriteria(data.criterios || data.criteria || []),
            xPurchases: data.xCompras || data.xPurchases || null,
            serviceX: data.servicoX || data.serviceX || null,
            customerCount: data.numClientes || data.customerCount || null,
            active: isUpdate && data.active === undefined ? undefined : (data.active !== undefined ? Boolean(data.active) : true),
            tenantId,
        };
        
        if (isUpdate) {
            Object.keys(payload).forEach(key => {
                if (payload[key] === undefined && key !== 'tenantId') {
                    delete payload[key];
                }
            });
        }
        
        return payload;
    }

    static normalizeCriteria(value) {
        if (Array.isArray(value)) return JSON.stringify(value);
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? JSON.stringify(parsed) : JSON.stringify([]);
            } catch (_error) {
                return JSON.stringify([]);
            }
        }
        return JSON.stringify([]);
    }

    static parseCriteria(criteria) {
        try {
            if (Array.isArray(criteria)) return criteria;
            if (typeof criteria === 'string') {
                const parsed = JSON.parse(criteria);
                return Array.isArray(parsed) ? parsed : [];
            }
            return [];
        } catch (_error) {
            return [];
        }
    }

    static normalizeOutput(item) {
        if (!item) return item;
        const raw = typeof item.get === 'function' ? item.get({ plain: true }) : { ...item };
        
        return {
            ...raw,
            criteria: this.parseCriteria(raw.criteria),
        };
    }
}

module.exports = PromotionService;