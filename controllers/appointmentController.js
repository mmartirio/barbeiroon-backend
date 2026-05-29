const AppointmentService = require('../services/appointmentService');
const WhatsAppService = require('../services/whatsappService');
const User = require('../models/User');
const AppointmentRequest = require('../models/AppointmentRequest');
const Service = require('../models/Service');
const sequelize = require('../config/db');
const { QueryTypes } = require('sequelize');

const APPOINTMENT_STATUS = Object.freeze({
    PENDENTE: 'pendente',
    AGENDADO: 'agendado',
    CANCELADO: 'cancelado',
    CONCLUIDO: 'concluido',
});

let completedAppointmentsTableReady = false;
let pendingPromotionsTableReady = false;

const ensurePendingPromotionsTable = async () => {
    if (pendingPromotionsTableReady) return;
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS customer_pending_promotions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_phone VARCHAR(20) NOT NULL,
            promotion_id INT NOT NULL,
            tenant_id INT NOT NULL,
            activated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            redeemed_at DATETIME NULL,
            redeemed_appointment_id INT NULL,
            INDEX idx_cpp_customer (customer_phone, tenant_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    pendingPromotionsTableReady = true;
};

const ensureCompletedAppointmentsTable = async () => {
    if (completedAppointmentsTableReady) return;

    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS completed_appointments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id INT NOT NULL,
            appointment_id INT NULL,
            service_id INT NULL,
            professional_id INT NULL,
            customer_phone VARCHAR(20) NULL,
            appointment_date DATE NULL,
            appointment_time TIME NULL,
            revenue_value DECIMAL(10,2) NOT NULL DEFAULT 0,
            completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_completed_tenant_month (tenant_id, completed_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    completedAppointmentsTableReady = true;
};

const registerCompletedAppointment = async ({ appointment, tenantId }) => {
    if (!appointment || !tenantId) return;

    await ensureCompletedAppointmentsTable();

    const revenueValue = Number(appointment?.service?.price || 0);

    await sequelize.query(
        `
            INSERT INTO completed_appointments (
                tenant_id,
                appointment_id,
                service_id,
                professional_id,
                customer_phone,
                appointment_date,
                appointment_time,
                revenue_value,
                completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `,
        {
            replacements: [
                tenantId,
                appointment.id || null,
                appointment.serviceId || appointment.service?.id || null,
                appointment.professionalId || null,
                appointment.customerPhone || appointment.customer?.phone || null,
                appointment.appointmentDate || null,
                appointment.appointmentTime || null,
                Number.isNaN(revenueValue) ? 0 : revenueValue
            ]
        }
    );
};

exports.checkPendingPromotions = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const { customerPhone } = req.query;
        if (!customerPhone) return res.status(400).json({ message: 'customerPhone é obrigatório.' });

        await ensurePendingPromotionsTable();

        const pending = await sequelize.query(
            `SELECT cpp.id, cpp.promotion_id AS promotionId, p.name, p.price,
                    p.price_type AS priceType, p.discount_type AS discountType
             FROM customer_pending_promotions cpp
             JOIN promotions p ON p.id = cpp.promotion_id
             WHERE cpp.customer_phone = :customerPhone
               AND cpp.tenant_id = :tenantId
               AND cpp.redeemed_at IS NULL`,
            { replacements: { customerPhone, tenantId }, type: QueryTypes.SELECT }
        );

        res.status(200).json({ pendingPromotions: pending, hasPending: pending.length > 0 });
    } catch (error) {
        console.error('Erro ao verificar promoções pendentes:', error);
        res.status(500).json({ message: 'Não foi possível verificar promoções pendentes.' });
    }
};

exports.checkPromotionUsage = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const { customerPhone, promotionId } = req.query;
        if (!customerPhone || !promotionId) {
            return res.status(400).json({ message: 'customerPhone e promotionId são obrigatórios.' });
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const [result] = await sequelize.query(
            `SELECT COUNT(*) AS cnt FROM appointment
             WHERE customer_phone = :customerPhone
               AND promotion_id = :promotionId
               AND tenant_id = :tenantId
               AND YEAR(appointment_date) = :year
               AND MONTH(appointment_date) = :month`,
            { replacements: { customerPhone, promotionId, tenantId, year, month }, type: QueryTypes.SELECT }
        );

        const alreadyUsed = Number(result?.cnt || 0) > 0;
        res.status(200).json({ alreadyUsed });
    } catch (error) {
        console.error('Erro ao verificar uso de promoção:', error);
        res.status(500).json({ message: 'Não foi possível verificar o uso da promoção.' });
    }
};

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

        // Verificar limite mensal de agendamentos do plano
        const { getEffectiveLimits } = require('../middlewares/planLimitMiddleware');
        const limits = getEffectiveLimits(req.tenant);
        if (limits.maxAppointments !== null) {
            const now = new Date();
            const [countRow] = await sequelize.query(
                `SELECT COUNT(*) AS cnt FROM appointment
                 WHERE tenant_id = :tenantId
                   AND YEAR(appointment_date) = :year
                   AND MONTH(appointment_date) = :month
                   AND status != 'cancelado'`,
                {
                    replacements: { tenantId, year: now.getFullYear(), month: now.getMonth() + 1 },
                    type: QueryTypes.SELECT,
                }
            );
            const currentCount = Number(countRow?.cnt || 0);
            if (currentCount >= limits.maxAppointments) {
                return res.status(403).json({
                    message: `Você atingiu o limite de ${limits.maxAppointments} agendamentos deste mês no plano ${limits.planName}. O limite renova automaticamente no início do próximo mês. Entre em contato com o suporte para fazer upgrade.`,
                    limitReached: true,
                    limitType: 'appointments',
                    limit: limits.maxAppointments,
                    current: currentCount,
                    planName: limits.planName,
                });
            }
        }

        const appointment = await AppointmentService.create(req.body, tenantId);

        // Registrar ativação de promoção "próxima compra"
        if (req.body.promotionId && req.body.activateNextPurchase) {
            try {
                await ensurePendingPromotionsTable();
                await sequelize.query(
                    'INSERT INTO customer_pending_promotions (customer_phone, promotion_id, tenant_id) VALUES (?, ?, ?)',
                    { replacements: [req.body.customerPhone, req.body.promotionId, tenantId] }
                );
            } catch (err) {
                console.error('Erro ao registrar promoção pendente:', err.message);
            }
        }

        // Marcar promoção pendente como resgatada
        if (req.body.pendingPromotionRecordId) {
            try {
                await ensurePendingPromotionsTable();
                await sequelize.query(
                    'UPDATE customer_pending_promotions SET redeemed_at = NOW(), redeemed_appointment_id = ? WHERE id = ? AND tenant_id = ?',
                    { replacements: [appointment.id, req.body.pendingPromotionRecordId, tenantId] }
                );
            } catch (err) {
                console.error('Erro ao marcar promoção como resgatada:', err.message);
            }
        }

        const createdAppointment = await AppointmentService.getById(appointment.id, tenantId);
        const createdPlain = createdAppointment && typeof createdAppointment.get === 'function'
            ? createdAppointment.get({ plain: true })
            : createdAppointment;

        const barber = createdPlain?.professionalId
            ? await User.findOne({
                where: { id: createdPlain.professionalId, tenantId },
                attributes: ['id', 'name']
            })
            : null;

        const notifyResult = await WhatsAppService.sendCompletionMessage({
            to: req.tenant?.phone || null,
            barberName: barber?.name || `Profissional ${createdPlain?.professionalId || '-'}`,
            customerName: createdPlain?.customer?.name,
            customerPhone: createdPlain?.customer?.phone || createdPlain?.customerPhone,
            serviceName: createdPlain?.service?.name,
            appointmentDate: createdPlain?.appointmentDate,
            appointmentTime: String(createdPlain?.appointmentTime || '').slice(0, 5)
        });

        if (!notifyResult?.success && !notifyResult?.skipped) {
            console.error('Falha na notificacao WhatsApp de novo agendamento:', notifyResult);
        }

        // Enviar confirmação ao cliente
        try {
            await WhatsAppService.sendConfirmationMessage({
                to: createdPlain?.customer?.phone || createdPlain?.customerPhone,
                customerName: createdPlain?.customer?.name,
                serviceName: createdPlain?.service?.name,
                servicePrice: createdPlain?.service?.price,
                professionalName: createdPlain?.professional?.name || barber?.name,
                appointmentDate: createdPlain?.appointmentDate,
                appointmentTime: String(createdPlain?.appointmentTime || '').slice(0, 5),
                instanceName: req.tenant?.slug,
            });
        } catch (err) {
            console.error('Falha ao enviar confirmacao WhatsApp ao cliente:', err.message);
        }

        res.status(201).json(appointment);
    } catch (error) {
        if (error.statusCode === 409) {
            return res.status(409).json({ message: error.message });
        }
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
        const tenantId = req.tenant.id;
        const professionalId = req.user.id;
        const includeAll = String(req.query.includeAll || '').toLowerCase() === 'true' || String(req.query.includeAll || '') === '1';
        const includeTenant = String(req.query.includeTenant || '').toLowerCase() === 'true' || String(req.query.includeTenant || '') === '1';
        const date = includeAll ? null : (req.query.date || getTodayDateString());

        if (includeTenant) {
            const tenantAppointments = await AppointmentService.getAllGroupedByProfessional(tenantId, date);

            const userIds = tenantAppointments
                .filter((appointment) => appointment && appointment.professionalId)
                .map((appointment) => appointment.professionalId);

            const users = await User.findAll({
                where: { id: userIds, tenantId },
                attributes: ['id', 'name']
            });

            const userMap = new Map(users.map((user) => [String(user.id), user.name]));

            const withProfessionalName = tenantAppointments.map((appointment) => {
                const plain = typeof appointment.get === 'function' ? appointment.get({ plain: true }) : appointment;
                return {
                    ...plain,
                    professionalName: plain?.professional?.name || userMap.get(String(plain.professionalId)) || null,
                    status: plain?.status || APPOINTMENT_STATUS.AGENDADO,
                };
            });

            return res.status(200).json({ appointments: withProfessionalName, date, scope: 'tenant' });
        }

        const allowed = await canAccessOwnAppointments(req);
        if (!allowed) {
            return res.status(403).json({ message: 'Voce nao tem permissao para ver seus agendamentos.' });
        }

        const appointments = await AppointmentService.getByProfessional(professionalId, tenantId, date);
        res.status(200).json({ appointments, date });
    } catch (error) {
        console.error('Erro ao carregar agendamentos do barbeiro:', error);
        res.status(500).json({ message: 'Nao foi possivel carregar os agendamentos.' });
    }
};

exports.getCompletedOwn = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const professionalId = req.user.id;
        const includeAll = String(req.query.includeAll || '').toLowerCase() === 'true' || String(req.query.includeAll || '') === '1';
        const includeTenant = String(req.query.includeTenant || '').toLowerCase() === 'true' || String(req.query.includeTenant || '') === '1';
        const date = includeAll ? null : (req.query.date || getTodayDateString());

        if (includeTenant) {
            const completed = await AppointmentService.getCompleted({
                professionalId,
                tenantId,
                includeTenant: true,
                date,
            });
            return res.status(200).json({ appointments: completed, date, scope: 'tenant' });
        }

        const allowed = await canAccessOwnAppointments(req);
        if (!allowed) {
            return res.status(403).json({ message: 'Voce nao tem permissao para ver seus agendamentos concluidos.' });
        }

        const completed = await AppointmentService.getCompleted({
            professionalId,
            tenantId,
            includeTenant: false,
            date,
        });

        res.status(200).json({ appointments: completed, date });
    } catch (error) {
        console.error('Erro ao carregar agendamentos concluidos do barbeiro:', error);
        res.status(500).json({ message: 'Nao foi possivel carregar os agendamentos concluidos.' });
    }
};

exports.cancelOwn = async (req, res) => {
    try {
        const allowed = await canAccessOwnAppointments(req);
        if (!allowed) {
            return res.status(403).json({ message: 'Voce nao tem permissao para cancelar este agendamento.' });
        }

        const { id } = req.params;
        const { reason } = req.body || {};
        const tenantId = req.tenant.id;
        const professionalId = req.user.id;
        const canManageTenantAppointments = !!req.user?.permissions?.canViewAppointments;

        const appointmentBeforeCancel = await AppointmentService.getById(id, tenantId);
        const apptPlain = appointmentBeforeCancel && typeof appointmentBeforeCancel.get === 'function'
            ? appointmentBeforeCancel.get({ plain: true })
            : appointmentBeforeCancel;

        let updated = await AppointmentService.updateStatusByProfessional(
            id,
            professionalId,
            tenantId,
            APPOINTMENT_STATUS.CANCELADO,
            [APPOINTMENT_STATUS.PENDENTE, APPOINTMENT_STATUS.AGENDADO]
        );

        if (!updated && canManageTenantAppointments) {
            updated = await AppointmentService.updateStatus(
                id,
                tenantId,
                APPOINTMENT_STATUS.CANCELADO,
                [APPOINTMENT_STATUS.PENDENTE, APPOINTMENT_STATUS.AGENDADO]
            );
        }

        if (!updated) {
            return res.status(404).json({ message: 'Agendamento nao encontrado ou status invalido para cancelamento.' });
        }

        if (apptPlain) {
            try {
                await WhatsAppService.sendCancellationMessage({
                    to: apptPlain?.customer?.phone || apptPlain?.customerPhone,
                    customerName: apptPlain?.customer?.name,
                    appointmentDate: apptPlain?.appointmentDate,
                    appointmentTime: String(apptPlain?.appointmentTime || '').slice(0, 5),
                    reason: reason || null,
                    instanceName: req.tenant?.slug,
                });
            } catch (err) {
                console.error('Falha ao enviar cancelamento WhatsApp ao cliente:', err.message);
            }
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

        const appointment = await AppointmentService.getById(id, tenantId);
        if (!appointment) {
            return res.status(404).json({ message: 'Agendamento nao encontrado.' });
        }

        const appointmentPlain = typeof appointment.get === 'function' ? appointment.get({ plain: true }) : appointment;

        if (appointmentPlain.status === APPOINTMENT_STATUS.CONCLUIDO) {
            return res.status(400).json({ message: 'Agendamento ja esta concluido.' });
        }

        if (appointmentPlain.status === APPOINTMENT_STATUS.CANCELADO) {
            return res.status(400).json({ message: 'Agendamento cancelado nao pode ser concluido.' });
        }

        const barber = await User.findOne({
            where: { id: appointmentPlain.professionalId, tenantId },
            attributes: ['id', 'name']
        });

        const canManageTenantAppointments = !!req.user?.permissions?.canViewAppointments;

        let updated = await AppointmentService.updateStatusByProfessional(
            id,
            professionalId,
            tenantId,
            APPOINTMENT_STATUS.CONCLUIDO,
            [APPOINTMENT_STATUS.PENDENTE, APPOINTMENT_STATUS.AGENDADO]
        );

        if (!updated && canManageTenantAppointments) {
            updated = await AppointmentService.updateStatus(
                id,
                tenantId,
                APPOINTMENT_STATUS.CONCLUIDO,
                [APPOINTMENT_STATUS.PENDENTE, APPOINTMENT_STATUS.AGENDADO]
            );
        }

        if (!updated) {
            return res.status(404).json({ message: 'Agendamento nao encontrado ou status invalido para conclusao.' });
        }

        try {
            await registerCompletedAppointment({ appointment: appointmentPlain, tenantId });
        } catch (historyError) {
            console.error('Falha ao registrar historico de conclusao:', historyError);
        }

        const whatsappRecipient = req.tenant?.phone || null;

        const whatsappResult = await WhatsAppService.sendCompletionMessage({
            to: whatsappRecipient,
            barberName: barber?.name || req.user?.name || `Profissional ${appointmentPlain.professionalId}`,
            customerName: appointmentPlain?.customer?.name,
            customerPhone: appointmentPlain?.customer?.phone || appointmentPlain?.customerPhone,
            serviceName: appointmentPlain?.service?.name,
            appointmentDate: appointmentPlain?.appointmentDate,
            appointmentTime: String(appointmentPlain?.appointmentTime || '').slice(0, 5)
        });

        if (!whatsappResult?.success && !whatsappResult?.skipped) {
            console.error('Falha no envio do WhatsApp apos conclusao:', whatsappResult);
        }

        res.status(200).json({
            message: 'Atendimento encerrado com sucesso',
            whatsappRedirectUrl: whatsappResult?.redirectUrl || null,
            whatsappSent: !!whatsappResult?.success
        });
    } catch (error) {
        console.error('Erro ao encerrar agendamento do barbeiro:', error);
        res.status(500).json({ message: 'Nao foi possivel encerrar o atendimento.' });
    }
};

exports.getAllGroupedByDate = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const includeAll = String(req.query.includeAll || '').toLowerCase() === 'true' || String(req.query.includeAll || '') === '1';
        const date = includeAll ? null : (req.query.date || getTodayDateString());
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

        // Notifica o cliente via WhatsApp
        try {
            const Customer = require('../models/Customer');
            const [service, professional, customer] = await Promise.all([
                Service.findByPk(request.serviceId),
                User.findByPk(request.professionalId),
                Customer.findOne({ where: { phone: request.customerPhone, tenantId } }),
            ]);
            await WhatsAppService.sendConfirmationMessage({
                to: request.customerPhone,
                customerName: customer?.name || null,
                serviceName: service?.name || null,
                professionalName: professional?.name || null,
                appointmentDate: request.appointmentDate,
                appointmentTime: request.appointmentTime,
                servicePrice: service?.price || null,
                instanceName: req.tenant?.slug,
            });
        } catch (e) {
            console.warn('[approveRequest] falha ao enviar WhatsApp (não crítico):', e.message);
        }

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
