const ServiceService = require('../services/serviceService');

exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const tenantId = req.tenant.id;
        const result = await ServiceService.getAll({ tenantId, page, limit });
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
        res.status(500).json({ message: 'Erro ao carregar serviços' });
    }
};

exports.create = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const service = await ServiceService.create(req.body, tenantId);
        res.status(201).json(service);
    } catch (error) {
        console.error('Erro ao criar serviço:', error);
        res.status(500).json({ message: 'Erro ao criar serviço' });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;
        const deleted = await ServiceService.delete(id, tenantId);
        if (!deleted) {
            return res.status(404).json({ message: 'Serviço não encontrado' });
        }
        res.status(200).json({ message: 'Serviço removido com sucesso' });
    } catch (error) {
        console.error('Erro ao remover serviço:', error);
        res.status(500).json({ message: 'Erro ao remover serviço' });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;
        const updated = await ServiceService.update(id, req.body, tenantId);
        if (!updated) {
            return res.status(404).json({ message: 'Serviço não encontrado' });
        }
        res.status(200).json(updated);
    } catch (error) {
        console.error('Erro ao editar serviço:', error);
        res.status(500).json({ message: 'Erro ao editar serviço' });
    }
};
