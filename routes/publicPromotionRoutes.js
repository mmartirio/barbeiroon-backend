const express = require('express');
const router = express.Router();

const PromotionService = require('../services/promotionService');

// Retorna promoções ativas e aplicáveis para o cliente
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

module.exports = router;
