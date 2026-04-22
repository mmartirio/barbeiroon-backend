const PromotionService = require('../services/promotionService');

exports.getAll = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const result = await PromotionService.getAll({ tenantId, page, limit });
        
        // Garantir que o formato da resposta seja consistente
        res.status(200).json({
            promotions: result.promotions || [],
            total: result.total || 0,
            page: result.page || page,
            limit: result.limit || limit
        });
    } catch (error) {
        console.error('Erro ao carregar promocoes:', error);
        // Log extra para depuração
        if (req && req.tenant) {
            console.error('Tenant no request:', req.tenant);
        } else {
            console.error('Tenant NÃO definido no request!');
        }
        if (req && req.user) {
            console.error('Usuário no request:', req.user);
        } else {
            console.error('Usuário NÃO definido no request!');
        }
        res.status(500).json({ message: 'Nao foi possivel carregar promocoes.', error: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const { id } = req.params;
        const promotion = await PromotionService.getById(id, tenantId);
        
        if (!promotion) {
            return res.status(404).json({ message: 'Promocao nao encontrada.' });
        }
        
        res.status(200).json(promotion);
    } catch (error) {
        console.error('Erro ao buscar promocao:', error);
        res.status(500).json({ message: 'Nao foi possivel buscar a promocao.' });
    }
};

exports.create = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const created = await PromotionService.create(req.body, tenantId);
        
        // RETORNAR O OBJETO COMPLETO COM ID
        res.status(201).json(created);
    } catch (error) {
        console.error('Erro ao criar promocao:', error);
        const status = /obrigatori|invalid|invalida/i.test(error?.message || '') ? 400 : 500;
        res.status(status).json({ message: error.message || 'Nao foi possivel criar promocao.' });
    }
};

exports.update = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const { id } = req.params;
        const updated = await PromotionService.update(id, req.body, tenantId);
        
        if (!updated) {
            return res.status(404).json({ message: 'Promocao nao encontrada.' });
        }
        
        res.status(200).json(updated);
    } catch (error) {
        console.error('Erro ao atualizar promocao:', error);
        const status = /obrigatori|invalid|invalida/i.test(error?.message || '') ? 400 : 500;
        res.status(status).json({ message: error.message || 'Nao foi possivel atualizar promocao.' });
    }
};

exports.delete = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const { id } = req.params;
        const deleted = await PromotionService.delete(id, tenantId);
        
        if (!deleted) {
            return res.status(404).json({ message: 'Promocao nao encontrada.' });
        }
        
        res.status(200).json({ message: 'Promocao removida com sucesso.' });
    } catch (error) {
        console.error('Erro ao remover promocao:', error);
        res.status(500).json({ message: 'Nao foi possivel remover promocao.' });
    }
};