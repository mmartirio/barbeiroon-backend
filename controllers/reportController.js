const ReportService = require('../services/reportService');

exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const tenantId = req.tenant.id;
        const result = await ReportService.getAll({ tenantId, page, limit });
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
        res.status(500).json({ message: 'Erro ao carregar relatórios' });
    }
};

exports.create = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const report = await ReportService.create(req.body, tenantId);
        res.status(201).json(report);
    } catch (error) {
        console.error('Erro ao criar relatório:', error);
        res.status(500).json({ message: 'Erro ao criar relatório' });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;
        const deleted = await ReportService.delete(id, tenantId);
        if (!deleted) {
            return res.status(404).json({ message: 'Relatório não encontrado' });
        }
        res.status(200).json({ message: 'Relatório removido com sucesso' });
    } catch (error) {
        console.error('Erro ao remover relatório:', error);
        res.status(500).json({ message: 'Erro ao remover relatório' });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;
        const updated = await ReportService.update(id, req.body, tenantId);
        if (!updated) {
            return res.status(404).json({ message: 'Relatório não encontrado' });
        }
        res.status(200).json(updated);
    } catch (error) {
        console.error('Erro ao editar relatório:', error);
        res.status(500).json({ message: 'Erro ao editar relatório' });
    }
};
