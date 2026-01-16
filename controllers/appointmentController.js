const AppointmentService = require('../services/appointmentService');

exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const tenantId = req.tenant.id;
        const result = await AppointmentService.getAll({ tenantId, page, limit });
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        res.status(500).json({ message: '😞 Não foi possível carregar a lista de agendamentos. Tente novamente em alguns instantes.' });
    }
};

exports.create = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const appointment = await AppointmentService.create(req.body, tenantId);
        res.status(201).json(appointment);
    } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        res.status(500).json({ message: '😞 Não foi possível criar o agendamento. Verifique se todos os dados foram preenchidos corretamente.' });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;
        const deleted = await AppointmentService.delete(id, tenantId);
        if (!deleted) {
            return res.status(404).json({ message: '🔍 Agendamento não encontrado. Ele pode já ter sido removido.' });
        }
        res.status(200).json({ message: 'Agendamento removido com sucesso' });
    } catch (error) {
        console.error('Erro ao remover agendamento:', error);
        res.status(500).json({ message: '😞 Não foi possível remover o agendamento. Tente novamente.' });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;
        const updated = await AppointmentService.update(id, req.body, tenantId);
        if (!updated) {
            return res.status(404).json({ message: '🔍 Agendamento não encontrado para edição.' });
        }
        res.status(200).json(updated);
    } catch (error) {
        console.error('Erro ao editar agendamento:', error);
        res.status(500).json({ message: '😞 Não foi possível editar o agendamento. Verifique os dados e tente novamente.' });
    }
};
