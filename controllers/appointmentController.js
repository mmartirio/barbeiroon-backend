const AppointmentService = require('../services/appointmentService');
const User = require('../models/User');

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

const getTodayDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const canAccessOwnAppointments = async (req) => {
    if (req.user?.permissions?.canViewAppointments) {
        return true;
    }
    const user = await User.findByPk(req.user?.id, { attributes: ['id', 'isBarber'] });
    return !!user?.isBarber;
};

exports.getOwn = async (req, res) => {
    try {
        const allowed = await canAccessOwnAppointments(req);
        if (!allowed) {
            return res.status(403).json({ message: 'Voce nao tem permissao para ver seus agendamentos.' });
        }

        const tenantId = req.tenant.id;
        const professionalId = req.user.id;
        const date = req.query.date || getTodayDateString();
        const appointments = await AppointmentService.getByProfessional(professionalId, tenantId, date);
        res.status(200).json({ appointments, date });
    } catch (error) {
        console.error('Erro ao carregar agendamentos do barbeiro:', error);
        res.status(500).json({ message: 'Nao foi possivel carregar os agendamentos.' });
    }
};

exports.cancelOwn = async (req, res) => {
    try {
        const allowed = await canAccessOwnAppointments(req);
        if (!allowed) {
            return res.status(403).json({ message: 'Voce nao tem permissao para cancelar este agendamento.' });
        }

        const { id } = req.params;
        const tenantId = req.tenant.id;
        const professionalId = req.user.id;
        const deleted = await AppointmentService.deleteByProfessional(id, professionalId, tenantId);
        if (!deleted) {
            return res.status(404).json({ message: 'Agendamento nao encontrado.' });
        }
        res.status(200).json({ message: 'Agendamento cancelado com sucesso' });
    } catch (error) {
        console.error('Erro ao cancelar agendamento do barbeiro:', error);
        res.status(500).json({ message: 'Nao foi possivel cancelar o agendamento.' });
    }
};

exports.closeOwn = async (req, res) => {
    try {
        const allowed = await canAccessOwnAppointments(req);
        if (!allowed) {
            return res.status(403).json({ message: 'Voce nao tem permissao para encerrar este agendamento.' });
        }

        const { id } = req.params;
        const tenantId = req.tenant.id;
        const professionalId = req.user.id;
        const deleted = await AppointmentService.deleteByProfessional(id, professionalId, tenantId);
        if (!deleted) {
            return res.status(404).json({ message: 'Agendamento nao encontrado.' });
        }
        res.status(200).json({ message: 'Atendimento encerrado com sucesso' });
    } catch (error) {
        console.error('Erro ao encerrar agendamento do barbeiro:', error);
        res.status(500).json({ message: 'Nao foi possivel encerrar o atendimento.' });
    }
};

exports.getAllGroupedByDate = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const date = req.query.date || getTodayDateString();
        const appointments = await AppointmentService.getAllGroupedByProfessional(tenantId, date);

        const userIds = appointments
            .filter(a => a && a.professionalId)
            .map(a => a.professionalId);

        const users = await User.findAll({
            where: { id: userIds, tenantId },
            attributes: ['id', 'name']
        });

        const userMap = new Map(users.map(u => [String(u.id), u.name]));

        const grouped = appointments.reduce((acc, appointment) => {
            const plain = typeof appointment.get === 'function' ? appointment.get({ plain: true }) : appointment;
            const key = String(plain.professionalId || 'unknown');
            const name = userMap.get(key) || `Profissional ${key}`;

            if (!acc[key]) {
                acc[key] = {
                    professionalId: plain.professionalId,
                    professionalName: name,
                    appointments: []
                };
            }
            acc[key].appointments.push(plain);
            return acc;
        }, {});

        res.status(200).json({
            date,
            groups: Object.values(grouped)
        });
    } catch (error) {
        console.error('Erro ao carregar agendamentos agrupados:', error);
        res.status(500).json({ message: 'Nao foi possivel carregar os agendamentos.' });
    }
};
