// routes/publicAppointmentRoutes.js
const express = require('express');
const router = express.Router();

// CORREÇÃO: Importar o AppointmentService corretamente
const AppointmentService = require('../services/AppointmentService'); // Note o 'A' maiúsculo
// OU se o arquivo estiver com letra minúscula:
// const AppointmentService = require('../services/appointmentService');

const CustomerService = require('../services/customerService');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const AgendaSettings = require('../models/AgendaSettings');
const Indisponibilidade = require('../models/Indisponibilidade');
const EncerramentoAntecipado = require('../models/EncerramentoAntecipado');
const Service = require('../models/Service');
const AppointmentRequest = require('../models/AppointmentRequest');
const Tenant = require('../models/Tenant');
const WhatsAppService = require('../services/whatsappService');
const sequelize = require('../config/db');
const { QueryTypes, Op } = require('sequelize');

const APPOINTMENT_STATUS = Object.freeze({
    PENDENTE: 'pendente',
    AGENDADO: 'agendado',
    CANCELADO: 'cancelado',
    CONCLUIDO: 'concluido',
});

// Verificar se o AppointmentService foi carregado
console.log('🔍 AppointmentService carregado:', typeof AppointmentService);
console.log('📋 Métodos disponíveis:', Object.keys(AppointmentService || {}));

const parseTimeToMinutes = (value) => {
    if (!value) return null;
    const [h, m] = String(value).split(':');
    if (h === undefined || m === undefined) return null;
    return parseInt(h, 10) * 60 + parseInt(m, 10);
};

const minutesToTime = (minutes) => {
    const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mins = String(minutes % 60).padStart(2, '0');
    return `${hours}:${mins}`;
};

const buildSlots = (start, end, duration, step) => {
    const slots = [];
    for (let m = start; m + duration <= end; m += step) {
        slots.push(minutesToTime(m));
    }
    return slots;
};

const parseDurationToMinutes = (value, fallback) => {
    if (!value && value !== 0) return fallback;
    if (typeof value === 'number') return value;
    const parts = String(value).split(':');
    if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        return hours * 60 + minutes;
    }
    const numeric = parseInt(value, 10);
    return Number.isNaN(numeric) ? fallback : numeric;
};

const getAvailableTimes = async ({ professionalId, date, tenantId, serviceId }) => {
    let settings = null;
    try {
        settings = await AgendaSettings.findOne({
            where: { tenantId, professionalId: professionalId || null }
        });
        if (!settings) {
            settings = await AgendaSettings.findOne({
                where: { tenantId, professionalId: null }
            });
        }
    } catch (error) {
        if (!(error && error.original && error.original.code === 'ER_NO_SUCH_TABLE')) {
            throw error;
        }
    }

    const defaultStart = '08:00';
    const defaultEnd = '18:00';
    const defaultLunchStart = '12:00';
    const defaultLunchEnd = '13:00';

    const startTime = settings?.inicioExpediente || defaultStart;
    const endTime = settings?.fimExpediente || defaultEnd;
    const lunchStart = settings?.inicioAlmoco || defaultLunchStart;
    const lunchEnd = settings?.fimAlmoco || defaultLunchEnd;

    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);
    const lunchStartMinutes = parseTimeToMinutes(lunchStart);
    const lunchEndMinutes = parseTimeToMinutes(lunchEnd);

    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        return { availableTimes: [], overflowTimes: [], serviceDuration: 30 };
    }

    const dateOnly = String(date).split('T')[0];
    let serviceDuration = 30;
    if (serviceId) {
        const service = await Service.findOne({ where: { id: serviceId, tenantId } });
        serviceDuration = parseDurationToMinutes(service?.duration, serviceDuration);
    }
    const step = 15;
    const allSlots = buildSlots(startMinutes, endMinutes, 0, step);
    let availableTimes = allSlots.filter((time) => {
        const start = parseTimeToMinutes(time);
        return start + (serviceDuration || 30) <= endMinutes;
    });
    let overflowTimes = allSlots.filter((time) => {
        const start = parseTimeToMinutes(time);
        return start + (serviceDuration || 30) > endMinutes;
    });

    if (lunchStartMinutes !== null && lunchEndMinutes !== null && lunchEndMinutes > lunchStartMinutes) {
        const filterLunch = (time) => {
            const minutes = parseTimeToMinutes(time);
            return minutes < lunchStartMinutes || minutes >= lunchEndMinutes;
        };
        availableTimes = availableTimes.filter(filterLunch);
        overflowTimes = overflowTimes.filter(filterLunch);
    }

    if (settings?.diasCalendario) {
        const diasCalendario = JSON.parse(settings.diasCalendario || '[]');
        if (Array.isArray(diasCalendario) && diasCalendario.length > 0 && !diasCalendario.includes(dateOnly)) {
            return { availableTimes: [], overflowTimes: [], serviceDuration };
        }
    }

    if (settings?.diasSelecionados) {
        const diasSelecionados = JSON.parse(settings.diasSelecionados || '[]');
        if (Array.isArray(diasSelecionados) && diasSelecionados.length > 0) {
            const dateObj = new Date(`${dateOnly}T00:00:00`);
            const weekday = dateObj.getDay();
            if (!diasSelecionados.includes(weekday)) {
                return { availableTimes: [], overflowTimes: [], serviceDuration };
            }
        }
    }

    const indisponiveis = await Indisponibilidade.findAll({ where: { dia: dateOnly } });
    if (indisponiveis.length > 0) {
        const filterIndisponivel = (time) => {
            const minutes = parseTimeToMinutes(time);
            return !indisponiveis.some((item) => {
                const start = parseTimeToMinutes(item.inicio);
                const end = parseTimeToMinutes(item.fim);
                return start !== null && end !== null && minutes >= start && minutes < end;
            });
        };
        availableTimes = availableTimes.filter(filterIndisponivel);
        overflowTimes = overflowTimes.filter(filterIndisponivel);
    }

    const encerramentos = await EncerramentoAntecipado.findAll({ where: { dia: dateOnly } });
    if (encerramentos.length > 0) {
        const earliest = encerramentos.reduce((acc, item) => {
            const minutes = parseTimeToMinutes(item.hora);
            if (minutes === null) return acc;
            return acc === null ? minutes : Math.min(acc, minutes);
        }, null);

        if (earliest !== null) {
            const filterEarlyClose = (time) => parseTimeToMinutes(time) < earliest;
            availableTimes = availableTimes.filter(filterEarlyClose);
            overflowTimes = overflowTimes.filter(filterEarlyClose);
        }
    }

    const booked = await Appointment.findAll({
        where: {
            tenantId,
            professionalId: professionalId || null,
            appointmentDate: dateOnly
        },
        include: [
            {
                model: Service,
                as: 'service',
                attributes: ['duration']
            }
        ]
    });
    
    if (booked.length > 0) {
        const blockedRanges = booked.map((appt) => {
            const start = parseTimeToMinutes(String(appt.appointmentTime).slice(0, 5));
            const duration = parseDurationToMinutes(appt.service?.duration, 30);
            return {
                start,
                end: start !== null ? start + duration : null
            };
        }).filter((range) => range.start !== null && range.end !== null);

        const filterOverlap = (time) => {
            const start = parseTimeToMinutes(time);
            const end = start + (serviceDuration || 30);
            return !blockedRanges.some((range) => start < range.end && end > range.start);
        };
        availableTimes = availableTimes.filter(filterOverlap);
        overflowTimes = overflowTimes.filter(filterOverlap);
    }

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    if (dateOnly === todayString) {
        const currentMinutes = today.getHours() * 60 + today.getMinutes();
        const filterPast = (time) => parseTimeToMinutes(time) > currentMinutes;
        availableTimes = availableTimes.filter(filterPast);
        overflowTimes = overflowTimes.filter(filterPast);
    }

    return { availableTimes, overflowTimes, serviceDuration };
};

/**
 * Endpoint público para criar agendamento
 */
router.post('/create', async (req, res) => {
    try {
        let { customerPhone, serviceId, professionalId, date, tenantId } = req.body;

        if (!customerPhone || !serviceId || !professionalId || !date || !tenantId) {
            return res.status(400).json({ 
                message: 'Dados incompletos. Campos obrigatórios: customerPhone, serviceId, professionalId, date, tenantId' 
            });
        }

        const customer = await CustomerService.getCustomerByPhone(customerPhone, tenantId);
        if (!customer) {
            return res.status(404).json({ 
                message: 'Cliente não encontrado. Por favor, cadastre-se primeiro.' 
            });
        }

        if (typeof professionalId === 'string' && professionalId.startsWith('user-')) {
            professionalId = parseInt(professionalId.replace('user-', ''), 10);
        }

        const selectedDate = String(date).split('T')[0];
        const selectedTime = String(date).split('T')[1]?.slice(0, 5);

        if (!selectedTime) {
            return res.status(400).json({ message: 'Horario invalido.' });
        }

        const availability = await getAvailableTimes({
            professionalId,
            date: selectedDate,
            tenantId,
            serviceId
        });

        const availableTimes = availability.availableTimes || [];
        const overflowTimes = availability.overflowTimes || [];
        const serviceDuration = availability.serviceDuration || 30;

        if (!availableTimes.includes(selectedTime) && !overflowTimes.includes(selectedTime)) {
            return res.status(400).json({ message: 'Horario indisponivel.' });
        }

        if (overflowTimes.includes(selectedTime)) {
            const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
            const request = await AppointmentRequest.create({
                tenantId,
                customerPhone,
                serviceId,
                professionalId,
                appointmentDate: selectedDate,
                appointmentTime: selectedTime,
                durationMinutes: serviceDuration,
                status: 'pending',
                expiresAt
            });

            return res.status(202).json({
                message: 'Agendamento excede o expediente. Aguardando confirmacao do barbeiro.',
                status: 'pending',
                requestId: request.id,
                expiresAt: request.expiresAt
            });
        }

        // Usar o AppointmentService para criar
        const appointment = await AppointmentService.create({
            customerPhone,
            serviceId,
            professionalId,
            date
        }, tenantId);

        // Buscar o agendamento completo
        const createdAppointment = await Appointment.findOne({
            where: { id: appointment.id, tenantId },
            include: [
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['phone', 'name', 'birthDate']
                },
                {
                    model: Service,
                    as: 'service',
                    attributes: ['id', 'name', 'price', 'duration']
                },
                {
                    model: User,
                    as: 'professional',
                    attributes: ['id', 'name']
                }
            ]
        });

        const createdPlain = createdAppointment && typeof createdAppointment.get === 'function'
            ? createdAppointment.get({ plain: true })
            : createdAppointment;

        let barber = null;
        if (createdPlain?.professionalId) {
            barber = await User.findOne({
                where: { id: createdPlain.professionalId, tenantId },
                attributes: ['id', 'name']
            });
        }

        const tenant = await Tenant.findByPk(tenantId, { attributes: ['id', 'phone'] });

        // Tenta enviar notificação
        try {
            const notifyResult = await WhatsAppService.sendCompletionMessage({
                to: tenant?.phone || null,
                barberName: barber?.name || `Profissional ${createdPlain?.professionalId || '-'}`,
                customerName: createdPlain?.customer?.name || customer?.name,
                customerPhone: createdPlain?.customer?.phone || createdPlain?.customerPhone || customerPhone,
                serviceName: createdPlain?.service?.name,
                appointmentDate: createdPlain?.appointmentDate,
                appointmentTime: String(createdPlain?.appointmentTime || '').slice(0, 5)
            });

            if (!notifyResult?.success && !notifyResult?.skipped) {
                console.error('Falha na notificacao WhatsApp:', notifyResult);
            }
        } catch (notifyError) {
            console.error('Erro ao enviar notificação WhatsApp:', notifyError);
        }

        res.status(201).json({ 
            message: 'Agendamento criado com sucesso!',
            appointment: createdPlain 
        });
    } catch (error) {
        console.error('Erro ao criar agendamento público:', error);
        res.status(500).json({ message: 'Erro ao criar agendamento: ' + error.message });
    }
});

// Endpoint publico para listar agendamentos por telefone
router.get('/by-customer', async (req, res) => {
    try {
        const { customerPhone, tenantId } = req.query;

        if (!customerPhone || !tenantId) {
            return res.status(400).json({ message: 'Parâmetros obrigatórios: customerPhone, tenantId' });
        }

        const appointments = await AppointmentService.getByCustomerPhone(customerPhone, tenantId);

        const userIds = appointments
            .filter(a => a && a.professionalId)
            .map(a => a.professionalId);

        const users = await User.findAll({
            where: { id: userIds, tenantId },
            attributes: ['id', 'name']
        });

        const userMap = new Map(users.map(u => [String(u.id), u.name]));

        const activeAppointments = appointments.map(a => {
            const plain = typeof a.get === 'function' ? a.get({ plain: true }) : a;
            const professionalName = plain.professional?.name || userMap.get(String(plain.professionalId)) || null;
            return {
                ...plain,
                professionalName,
                status: plain.status || APPOINTMENT_STATUS.AGENDADO
            };
        });

        let completedAppointments = [];
        try {
            const completedRaw = await sequelize.query(
                `
                    SELECT
                        ca.id,
                        ca.appointment_id AS appointmentId,
                        ca.customer_phone AS customerPhone,
                        ca.professional_id AS professionalId,
                        ca.service_id AS serviceId,
                        ca.appointment_date AS appointmentDate,
                        ca.appointment_time AS appointmentTime,
                        ca.completed_at AS completedAt,
                        s.name AS serviceName,
                        u.name AS professionalName
                    FROM completed_appointments ca
                    LEFT JOIN service s ON s.id = ca.service_id
                    LEFT JOIN user u ON u.id = ca.professional_id
                    WHERE ca.tenant_id = :tenantId
                      AND ca.customer_phone = :customerPhone
                    ORDER BY ca.completed_at DESC
                `,
                {
                    replacements: { tenantId, customerPhone },
                    type: QueryTypes.SELECT
                }
            );

            completedAppointments = completedRaw.map((item) => ({
                id: item.appointmentId || `completed-${item.id}`,
                customerPhone: item.customerPhone,
                professionalId: item.professionalId,
                professionalName: item.professionalName || null,
                serviceId: item.serviceId,
                service: item.serviceName ? { name: item.serviceName } : null,
                appointmentDate: item.appointmentDate,
                appointmentTime: item.appointmentTime,
                completedAt: item.completedAt,
                status: APPOINTMENT_STATUS.CONCLUIDO
            }));
        } catch (error) {
            if (!(error && error.original && error.original.code === 'ER_NO_SUCH_TABLE')) {
                console.error('Erro ao buscar agendamentos concluídos:', error);
            }
        }

        const existingIds = new Set(activeAppointments.map((item) => String(item.id)));
        const completedOnly = completedAppointments.filter((item) => !existingIds.has(String(item.id)));

        const result = [...activeAppointments, ...completedOnly]
            .sort((a, b) => {
                const aDateTime = `${a.appointmentDate || ''} ${String(a.appointmentTime || '').slice(0, 5)}`;
                const bDateTime = `${b.appointmentDate || ''} ${String(b.appointmentTime || '').slice(0, 5)}`;
                return bDateTime.localeCompare(aDateTime);
            });

        res.status(200).json({ appointments: result });
    } catch (error) {
        console.error('Erro ao listar agendamentos públicos:', error);
        res.status(500).json({ message: 'Erro ao listar agendamentos: ' + error.message });
    }
});

// Endpoint publico para cancelar agendamento
router.post('/cancel', async (req, res) => {
    try {
        const { appointmentId, customerPhone, tenantId } = req.body;

        if (!appointmentId || !customerPhone || !tenantId) {
            return res.status(400).json({ message: 'Campos obrigatórios: appointmentId, customerPhone, tenantId' });
        }

        const updated = await AppointmentService.updateStatusByCustomer(
            appointmentId,
            customerPhone,
            tenantId,
            APPOINTMENT_STATUS.CANCELADO,
            [APPOINTMENT_STATUS.PENDENTE, APPOINTMENT_STATUS.AGENDADO]
        );
        
        if (!updated) {
            return res.status(404).json({ message: 'Agendamento não encontrado ou não pode ser cancelado.' });
        }

        res.status(200).json({ message: 'Agendamento cancelado com sucesso' });
    } catch (error) {
        console.error('Erro ao cancelar agendamento público:', error);
        res.status(500).json({ message: 'Erro ao cancelar agendamento: ' + error.message });
    }
});

// Endpoint público para listar horários disponíveis
router.get('/available-times', async (req, res) => {
    try {
        let { professionalId, date, tenantId, serviceId } = req.query;

        if (!professionalId || !date || !tenantId) {
            return res.status(400).json({ 
                message: 'Parâmetros obrigatórios: professionalId, date, tenantId' 
            });
        }

        if (typeof professionalId === 'string' && professionalId.startsWith('user-')) {
            professionalId = parseInt(professionalId.replace('user-', ''), 10);
        }

        const availability = await getAvailableTimes({
            professionalId,
            date,
            tenantId,
            serviceId
        });

        res.status(200).json({
            availableTimes: availability.availableTimes || [],
            overflowTimes: availability.overflowTimes || [],
            serviceDuration: availability.serviceDuration || 30
        });
    } catch (error) {
        console.error('Erro ao buscar horários disponíveis:', error);
        res.status(500).json({ message: 'Erro ao buscar horários disponíveis: ' + error.message });
    }
});

// Endpoint para buscar solicitação de agendamento pendente
router.get('/request/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { customerPhone, tenantId } = req.query;
        
        if (!id || !customerPhone || !tenantId) {
            return res.status(400).json({ message: 'Parametros obrigatorios: id, customerPhone, tenantId' });
        }

        const request = await AppointmentRequest.findOne({
            where: { id, customerPhone, tenantId }
        });

        if (!request) {
            return res.status(404).json({ message: 'Solicitacao nao encontrada.' });
        }

        if (request.status === 'pending' && new Date() > new Date(request.expiresAt)) {
            await request.update({ status: 'expired' });
        }

        res.status(200).json({
            id: request.id,
            status: request.status,
            expiresAt: request.expiresAt
        });
    } catch (error) {
        console.error('Erro ao buscar solicitacao:', error);
        res.status(500).json({ message: 'Erro ao buscar solicitacao: ' + error.message });
    }
});

module.exports = router;