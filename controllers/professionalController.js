const ProfessionalService = require('../services/professionalService');

exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const tenantId = req.tenant.id;
        const result = await ProfessionalService.getAll({ tenantId, page, limit });
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao carregar profissionais:', error);
        res.status(500).json({ message: '😞 Não foi possível carregar a lista de profissionais. Tente novamente em alguns instantes.' });
    }
};

exports.create = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const professional = await ProfessionalService.create(req.body, tenantId);
        res.status(201).json(professional);
    } catch (error) {
        console.error('Erro ao criar profissional:', error);
        res.status(500).json({ message: '😞 Não foi possível criar o profissional. Verifique se todos os dados foram preenchidos corretamente.' });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;
        const deleted = await ProfessionalService.delete(id, tenantId);
        if (!deleted) {
            return res.status(404).json({ message: '🔍 Profissional não encontrado. Ele pode já ter sido removido.' });
        }
        res.status(200).json({ message: 'Profissional removido com sucesso' });
    } catch (error) {
        console.error('Erro ao remover profissional:', error);
        res.status(500).json({ message: '😞 Não foi possível remover o profissional. Tente novamente.' });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;
        const updated = await ProfessionalService.update(id, req.body, tenantId);
        if (!updated) {
            return res.status(404).json({ message: '🔍 Profissional não encontrado para edição.' });
        }
        res.status(200).json(updated);
    } catch (error) {
        console.error('Erro ao editar profissional:', error);
        res.status(500).json({ message: '😞 Não foi possível editar o profissional. Verifique os dados e tente novamente.' });
    }
};
