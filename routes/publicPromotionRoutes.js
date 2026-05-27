const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Promotion = require('../models/Promotion');
const PromotionService = require('../services/promotionService');

// Valida tenantId numérico positivo
function validateTenantId(req, res, next) {
    const id = req.params.tenantId || req.query.tenantId;
    if (!id || !/^\d+$/.test(String(id)) || Number(id) <= 0 || Number(id) > 2147483647) {
        return res.status(400).json({ message: 'tenantId inválido.' });
    }
    next();
}

// Retorna promoções ativas e aplicáveis para o cliente (deve vir ANTES de /:tenantId)
router.get('/available', async (req, res) => {
    try {
        const { customerPhone, tenantId } = req.query;
        if (!customerPhone || !tenantId) {
            return res.status(400).json({ message: 'Parâmetros obrigatórios: customerPhone, tenantId' });
        }
        const promotions = await PromotionService.getAvailablePromotions({ customerPhone, tenantId });
        res.status(200).json({ promotions });
    } catch (error) {
        console.error('Erro ao buscar promoções disponíveis:', error);
        res.status(500).json({ message: 'Erro ao buscar promoções disponíveis.' });
    }
});

// Retorna promoções ativas de um tenant (para o portal do cliente)
router.get('/:tenantId', validateTenantId, async (req, res) => {
    try {
        const tenantId = Number(req.params.tenantId);
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
            attributes: ['id', 'name', 'price', 'priceType', 'discountType', 'validFrom', 'validUntil'],
            order: [['created_at', 'DESC']]
        });
        res.status(200).json({ promotions });
    } catch (error) {
        console.error('Erro ao buscar promoções do tenant:', error);
        res.status(500).json({ message: 'Erro ao buscar promoções.' });
    }
});

module.exports = router;
