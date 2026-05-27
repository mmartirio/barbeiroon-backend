const Promotion = require('../models/Promotion');
const { Op } = require('sequelize');

class PromotionService {
    /**
     * Busca promoções disponíveis para o cliente, gera voucher de aniversariante se aplicável
     * e retorna promoções já com campo voucher preenchido.
     */
    static async getAvailablePromotions({ customerPhone, tenantId }) {
        const Promotion = require('../models/Promotion');
        const VoucherService = require('./voucherService');
        const { Op } = require('sequelize');

        // Busca promoções ativas e válidas
        const today = new Date();
        const promotions = await Promotion.findAll({
            where: {
                tenantId,
                active: true,
                [Op.and]: [
                    { validFrom: { [Op.lte]: today } },
                    {
                        [Op.or]: [
                            { validUntil: null },
                            { validUntil: { [Op.gte]: today } }
                        ]
                    }
                ]
            },
            order: [['created_at', 'DESC']]
        });

        // Carregar dados do cliente para lógica de aniversariante
        const Customer = require('../models/Customer');
        const customer = await Customer.findOne({ where: { phone: customerPhone, tenantId } });

        const Appointment = require('../models/Appointment');

        // Montar lista de promoções com possível voucher
        const result = [];
        for (const promo of promotions) {
            const promoData = typeof promo.get === 'function' ? promo.get({ plain: true }) : promo;
            const promoCriteria = this.parseCriteria(promoData.criteria);

            // --- Verificação de elegibilidade por critério ---

            // target_customer: promoção é para um cliente específico
            const targetEntry = promoCriteria.find(c => typeof c === 'string' && c.startsWith('target_customer:'));
            if (targetEntry) {
                const targetId = targetEntry.split(':')[1];
                if (!customer || String(customer.id) !== String(targetId)) continue;
            }

            // x_compras: cliente precisa ter N atendimentos concluídos
            if (promoCriteria.includes('x_compras') && promoData.xPurchases) {
                const completed = await Appointment.count({
                    where: { customerPhone, tenantId, status: 'concluido' }
                });
                if (completed < Number(promoData.xPurchases)) continue;
            }

            // aniversariantes: cliente precisa fazer aniversário neste mês
            const isBirthdayPromo = promoData.discountType === 'aniversariante' || promoCriteria.includes('aniversariantes');
            if (isBirthdayPromo) {
                if (!customer || !customer.birthDate) continue;
                const birth = new Date(customer.birthDate);
                if (birth.getMonth() !== today.getMonth()) continue;
            }

            // --- Gerar voucher para aniversariante elegível ---
            let voucher = null;
            if (isBirthdayPromo) {
                const existing = await VoucherService.getValidVoucher({ customerPhone, tenantId, promotionId: promo.id });
                if (existing) {
                    voucher = existing.code;
                } else {
                    const expiresAt = new Date(today);
                    expiresAt.setDate(today.getDate() + 7);
                    const created = await VoucherService.generateVoucher({ customerPhone, tenantId, promotionId: promo.id, expiresAt });
                    voucher = created.code;
                }
            }

            result.push({ ...this.normalizeOutput(promo), voucher });
        }
        return result;
    }
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

        const criteria = this.parseCriteria(payload.criteria);

        if (criteria.includes('prazo_estimado') && !payload.validUntil) {
            throw new Error('Data final obrigatoria para o criterio "Efetiva no prazo estimado".');
        }
        if (criteria.includes('x_compras') && (!payload.xPurchases || Number(payload.xPurchases) < 1)) {
            throw new Error('Quantidade de compras invalida para o criterio selecionado.');
        }
        if (criteria.includes('servico_x') && !payload.serviceX) {
            throw new Error('Nome do servico obrigatorio para o criterio selecionado.');
        }
        if (criteria.includes('num_clientes') && (!payload.customerCount || Number(payload.customerCount) < 1)) {
            throw new Error('Numero de clientes invalido para o criterio selecionado.');
        }
        if (payload.priceType === 'percentual' && (Number(payload.price) <= 0 || Number(payload.price) > 100)) {
            throw new Error('Para desconto percentual, o valor deve ser entre 1 e 100.');
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

        const criteriaForUpdate = this.parseCriteria(payload.criteria ?? current.criteria);
        const effectiveValidUntil = payload.validUntil !== undefined ? payload.validUntil : current.validUntil;

        if (criteriaForUpdate.includes('prazo_estimado') && !effectiveValidUntil) {
            throw new Error('Data final obrigatoria para o criterio "Efetiva no prazo estimado".');
        }
        if (criteriaForUpdate.includes('x_compras')) {
            const xp = payload.xPurchases !== undefined ? payload.xPurchases : current.xPurchases;
            if (!xp || Number(xp) < 1) throw new Error('Quantidade de compras invalida para o criterio selecionado.');
        }
        if (criteriaForUpdate.includes('servico_x')) {
            const sx = payload.serviceX !== undefined ? payload.serviceX : current.serviceX;
            if (!sx) throw new Error('Nome do servico obrigatorio para o criterio selecionado.');
        }
        if (criteriaForUpdate.includes('num_clientes')) {
            const nc = payload.customerCount !== undefined ? payload.customerCount : current.customerCount;
            if (!nc || Number(nc) < 1) throw new Error('Numero de clientes invalido para o criterio selecionado.');
        }
        const effectivePriceType = payload.priceType !== undefined ? payload.priceType : current.priceType;
        const effectivePrice = payload.price !== undefined ? payload.price : current.price;
        if (effectivePriceType === 'percentual' && (Number(effectivePrice) <= 0 || Number(effectivePrice) > 100)) {
            throw new Error('Para desconto percentual, o valor deve ser entre 1 e 100.');
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
            motivo: raw.discountType, // alias para compatibilidade com o frontend
        };
    }
}

module.exports = PromotionService;