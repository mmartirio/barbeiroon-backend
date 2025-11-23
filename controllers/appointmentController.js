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
        res.status(500).json({ message: 'Erro ao carregar agendamentos' });
    }
};

exports.create = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const appointment = await AppointmentService.create(req.body, tenantId);
        res.status(201).json(appointment);
    } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        res.status(500).json({ message: 'Erro ao criar agendamento' });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;
        const deleted = await AppointmentService.delete(id, tenantId);
        if (!deleted) {
            return res.status(404).json({ message: 'Agendamento não encontrado' });
        }
        res.status(200).json({ message: 'Agendamento removido com sucesso' });
    } catch (error) {
        console.error('Erro ao remover agendamento:', error);
        res.status(500).json({ message: 'Erro ao remover agendamento' });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;
        const updated = await AppointmentService.update(id, req.body, tenantId);
        if (!updated) {
            return res.status(404).json({ message: 'Agendamento não encontrado' });
        }
        res.status(200).json(updated);
    } catch (error) {
        console.error('Erro ao editar agendamento:', error);
        res.status(500).json({ message: 'Erro ao editar agendamento' });
    }
};
