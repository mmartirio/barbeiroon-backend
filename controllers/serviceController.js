const ServiceService = require('../services/serviceService');

// Endpoint público para listar serviços (sem autenticação)
exports.getAllPublic = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const result = await ServiceService.getAll({ tenantId, page: 1, limit: 100 });
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
        res.status(500).json({ message: 'Não foi possível carregar os serviços.' });
    }
};

exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const tenantId = req.tenant.id;
        const result = await ServiceService.getAll({ tenantId, page, limit });
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
        res.status(500).json({ message: '😞 Não foi possível carregar a lista de serviços. Tente novamente em alguns instantes.' });
    }
};

exports.create = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const service = await ServiceService.create(req.body, tenantId);
        res.status(201).json(service);
    } catch (error) {
        console.error('Erro ao criar serviço:', error);
        res.status(500).json({ message: '😞 Não foi possível criar o serviço. Verifique se todos os dados foram preenchidos corretamente.' });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;
        const deleted = await ServiceService.delete(id, tenantId);
        if (!deleted) {
            return res.status(404).json({ message: '🔍 Serviço não encontrado. Ele pode já ter sido removido.' });
        }
        res.status(200).json({ message: 'Serviço removido com sucesso' });
    } catch (error) {
        console.error('Erro ao remover serviço:', error);
        res.status(500).json({ message: '😞 Não foi possível remover o serviço. Tente novamente.' });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;
        const updated = await ServiceService.update(id, req.body, tenantId);
        if (!updated) {
            return res.status(404).json({ message: '🔍 Serviço não encontrado para edição.' });
        }
        res.status(200).json(updated);
    } catch (error) {
        console.error('Erro ao editar serviço:', error);
        res.status(500).json({ message: '😞 Não foi possível editar o serviço. Verifique os dados e tente novamente.' });
    }
};

exports.getMonthlyRevenue = async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const months = await ServiceService.getMonthlyRevenue(tenantId, year);
    res.status(200).json({ months });
  } catch (error) {
    console.error('Erro ao carregar faturamento mensal:', error);
    res.status(500).json({ message: 'Erro ao carregar faturamento mensal' });
  }
};
