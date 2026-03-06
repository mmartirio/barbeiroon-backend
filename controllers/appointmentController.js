const AppointmentService = require('../services/appointmentService');
const User = require('../models/User');
const AppointmentRequest = require('../models/AppointmentRequest');
const Service = require('../models/Service');

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

const overlaps = (start, duration, otherStart, otherDuration) => {
    const end = start + duration;
    const otherEnd = otherStart + otherDuration;
    return start < otherEnd && end > otherStart;
};

const parseTimeToMinutes = (value) => {
    if (!value) return null;
    const [h, m] = String(value).split(':');
    if (h === undefined || m === undefined) return null;
    return parseInt(h, 10) * 60 + parseInt(m, 10);
};

exports.listPendingRequests = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const requests = await AppointmentRequest.findAll({
            where: { tenantId, status: 'pending' },
            order: [['createdAt', 'ASC']]
        });

        const now = new Date();
        for (const request of requests) {
            if (request.status === 'pending' && now > new Date(request.expiresAt)) {
                await request.update({ status: 'expired' });
            }
        }

        const filtered = requests.filter((r) => r.status === 'pending');

        const serviceIds = filtered.map((r) => r.serviceId);
        const professionalIds = filtered.map((r) => r.professionalId);

        const services = await Service.findAll({
            where: { id: serviceIds, tenantId },
            attributes: ['id', 'name']
        });
        const professionals = await User.findAll({
            where: { id: professionalIds, tenantId },
            attributes: ['id', 'name']
        });

        const serviceMap = new Map(services.map((s) => [String(s.id), s.name]));
        const professionalMap = new Map(professionals.map((p) => [String(p.id), p.name]));

        const result = filtered.map((request) => {
            const plain = typeof request.get === 'function' ? request.get({ plain: true }) : request;
            return {
                ...plain,
                serviceName: serviceMap.get(String(plain.serviceId)) || null,
                professionalName: professionalMap.get(String(plain.professionalId)) || null
            };
        });

        res.status(200).json({ requests: result });
    } catch (error) {
        console.error('Erro ao listar solicitacoes pendentes:', error);
        res.status(500).json({ message: 'Nao foi possivel carregar solicitacoes.' });
    }
};

exports.listPendingRequestsOwn = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const professionalId = req.user.id;
        const requests = await AppointmentRequest.findAll({
            where: { tenantId, professionalId, status: 'pending' },
            order: [['createdAt', 'ASC']]
        });

        const now = new Date();
        for (const request of requests) {
            if (request.status === 'pending' && now > new Date(request.expiresAt)) {
                await request.update({ status: 'expired' });
            }
        }

        const filtered = requests.filter((r) => r.status === 'pending');

        const serviceIds = filtered.map((r) => r.serviceId);
        const services = await Service.findAll({
            where: { id: serviceIds, tenantId },
            attributes: ['id', 'name']
        });
        const serviceMap = new Map(services.map((s) => [String(s.id), s.name]));

        const result = filtered.map((request) => {
            const plain = typeof request.get === 'function' ? request.get({ plain: true }) : request;
            return {
                ...plain,
                serviceName: serviceMap.get(String(plain.serviceId)) || null,
                professionalName: req.user?.name || null
            };
        });

        res.status(200).json({ requests: result });
    } catch (error) {
        console.error('Erro ao listar solicitacoes pendentes do barbeiro:', error);
        res.status(500).json({ message: 'Nao foi possivel carregar solicitacoes.' });
    }
};

exports.approveRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;
        const request = await AppointmentRequest.findOne({ where: { id, tenantId } });
        if (!request) {
            return res.status(404).json({ message: 'Solicitacao nao encontrada.' });
        }
        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'Solicitacao nao esta pendente.' });
        }
        if (new Date() > new Date(request.expiresAt)) {
            await request.update({ status: 'expired' });
            return res.status(400).json({ message: 'Solicitacao expirada.' });
        }

        const existing = await AppointmentService.getByProfessional(request.professionalId, tenantId, request.appointmentDate);
        const existingRanges = existing.map((appt) => {
            const start = parseTimeToMinutes(appt.appointmentTime);
            const duration = appt.service?.duration
                ? parseInt(String(appt.service.duration).split(':')[0], 10) * 60 + parseInt(String(appt.service.duration).split(':')[1], 10)
                : 30;
            return { start, duration };
        }).filter((range) => range.start !== null);

        const requestedStart = parseTimeToMinutes(request.appointmentTime);
        const requestedDuration = parseInt(request.durationMinutes, 10);
        if (existingRanges.some((range) => overlaps(requestedStart, requestedDuration, range.start, range.duration))) {
            return res.status(409).json({ message: 'Horario conflita com outro agendamento.' });
        }

        await AppointmentService.create({
            customerPhone: request.customerPhone,
            serviceId: request.serviceId,
            professionalId: request.professionalId,
            appointmentDate: request.appointmentDate,
            appointmentTime: request.appointmentTime
        }, tenantId);

        await request.update({ status: 'approved' });
        res.status(200).json({ message: 'Solicitacao aprovada.' });
    } catch (error) {
        console.error('Erro ao aprovar solicitacao:', error);
        res.status(500).json({ message: 'Nao foi possivel aprovar solicitacao.' });
    }
};

exports.rejectRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;
        const request = await AppointmentRequest.findOne({ where: { id, tenantId } });
        if (!request) {
            return res.status(404).json({ message: 'Solicitacao nao encontrada.' });
        }
        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'Solicitacao nao esta pendente.' });
        }
        await request.update({ status: 'rejected' });
        res.status(200).json({ message: 'Solicitacao recusada.' });
    } catch (error) {
        console.error('Erro ao recusar solicitacao:', error);
        res.status(500).json({ message: 'Nao foi possivel recusar solicitacao.' });
    }
};
