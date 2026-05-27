// routes/publicAppointmentRoutes.js
const express = require('express');
const router = express.Router();

// CORREÇÃO: Importar o AppointmentService corretamente (verificar o nome do arquivo)
let AppointmentService;
try {
    // Tenta importar com A maiúsculo
    AppointmentService = require('../services/AppointmentService');
} catch (err1) {
    try {
        // Tenta importar com a minúsculo
        AppointmentService = require('../services/appointmentService');
    } catch (err2) {
        console.error('❌ Erro ao importar AppointmentService:', err2.message);
        AppointmentService = null;
    }
}

// Importar PromotionService (se existir)
let PromotionService;
try {
    PromotionService = require('../services/promotionService');
} catch (err) {
    console.warn('⚠️ PromotionService não encontrado, vouchers podem não funcionar');
    PromotionService = null;
}

// Importar Customer
const Customer = require('../models/Customer');
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
console.log('🔍 AppointmentService carregado:', !!AppointmentService);
if (AppointmentService) {
    console.log('📋 Métodos disponíveis:', Object.keys(AppointmentService));
}

// Função auxiliar para buscar voucher disponível para o cliente
async function getAvailableVoucherForCustomer(customerPhone, tenantId) {
    if (!PromotionService) return null;
    
    try {
        const promotions = await PromotionService.getAvailablePromotions({ 
            customerPhone, 
            tenantId 
        });
        
        for (const promo of promotions) {
            if (promo.voucher) {
                return {
                    voucher: promo.voucher,
                    promotion: promo,
                    promotionId: promo.id
                };
            }
        }
        return null;
    } catch (error) {
        console.error('Erro ao buscar voucher:', error);
        return null;
    }
}

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
        console.log('📥 POST /create recebido:', req.body);
        
        let { customerPhone, serviceId, professionalId, date, tenantId } = req.body;

        // Validação de campos obrigatórios
        const missingFields = [];
        if (!customerPhone) missingFields.push('customerPhone');
        if (!serviceId) missingFields.push('serviceId');
        if (!professionalId) missingFields.push('professionalId');
        if (!date) missingFields.push('date');
        if (!tenantId) missingFields.push('tenantId');
        
        if (missingFields.length > 0) {
            return res.status(400).json({ 
                message: `Campos obrigatórios faltando: ${missingFields.join(', ')}`,
                missing: missingFields
            });
        }

        // Verificar se o AppointmentService está disponível
        if (!AppointmentService) {
            console.error('❌ AppointmentService não disponível');
            return res.status(500).json({ message: 'Serviço de agendamento não disponível' });
        }

        // Verificar se o método create existe
        if (typeof AppointmentService.create !== 'function') {
            console.error('❌ AppointmentService.create não é uma função');
            return res.status(500).json({ message: 'Método de criação não disponível' });
        }

        // Buscar cliente
        const customer = await CustomerService.getCustomerByPhone(customerPhone, tenantId);
        if (!customer) {
            return res.status(404).json({ 
                message: 'Cliente não encontrado. Por favor, cadastre-se primeiro.' 
            });
        }

        // Converter professionalId se necessário
        if (typeof professionalId === 'string' && professionalId.startsWith('user-')) {
            professionalId = parseInt(professionalId.replace('user-', ''), 10);
        }

        // Extrair data e hora
        const selectedDate = String(date).split('T')[0];
        const selectedTime = String(date).split('T')[1]?.slice(0, 5);

        if (!selectedTime) {
            return res.status(400).json({ message: 'Horario invalido.' });
        }

        // Verificar disponibilidade
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

        // Caso especial: horário que excede expediente
        if (overflowTimes.includes(selectedTime)) {
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
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

        // Criar agendamento
        console.log('📝 Criando agendamento...');
        const appointment = await AppointmentService.create({
            customerPhone,
            serviceId,
            professionalId,
            date
        }, tenantId);
        
        console.log('✅ Agendamento criado, ID:', appointment?.id);

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

        // Buscar voucher (se PromotionService estiver disponível)
        let voucherData = null;
        if (PromotionService) {
            try {
                voucherData = await getAvailableVoucherForCustomer(customerPhone, tenantId);
                console.log('Voucher encontrado:', voucherData);
            } catch (voucherError) {
                console.error('Erro ao buscar voucher:', voucherError);
            }
        }

        // Resposta de sucesso
        res.status(201).json({ 
            message: 'Agendamento criado com sucesso!',
            appointment: createdPlain,
            voucher: voucherData?.voucher || null,
            promotionId: voucherData?.promotionId || null
        });

        // Notificação WhatsApp (em segundo plano, não afeta resposta)
        try {
            let barber = null;
            if (createdPlain?.professionalId) {
                barber = await User.findOne({
                    where: { id: createdPlain.professionalId, tenantId },
                    attributes: ['id', 'name']
                });
            }
            const tenant = await Tenant.findByPk(tenantId, { attributes: ['id', 'phone'] });
            await WhatsAppService.sendCompletionMessage({
                to: tenant?.phone || null,
                barberName: barber?.name || `Profissional ${createdPlain?.professionalId || '-'}`,
                customerName: createdPlain?.customer?.name || customer?.name,
                customerPhone: createdPlain?.customer?.phone || createdPlain?.customerPhone || customerPhone,
                serviceName: createdPlain?.service?.name,
                appointmentDate: createdPlain?.appointmentDate,
                appointmentTime: String(createdPlain?.appointmentTime || '').slice(0, 5)
            });
        } catch (notifyError) {
            console.error('Erro ao enviar notificação WhatsApp:', notifyError);
        }
        
    } catch (error) {
        console.error('❌ Erro ao criar agendamento:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ 
            message: 'Erro ao criar agendamento: ' + error.message,
            error: error.message
        });
    }
});

// Endpoint publico para listar agendamentos por telefone
router.get('/by-customer', async (req, res) => {
    try {
        const { customerPhone, tenantId } = req.query;

        console.log('📥 GET /by-customer:', { customerPhone, tenantId });

        if (!customerPhone || !tenantId) {
            return res.status(400).json({ message: 'Parâmetros obrigatórios: customerPhone, tenantId' });
        }

        if (!AppointmentService) {
            return res.status(500).json({ message: 'Serviço de agendamento não disponível' });
        }

        const appointments = await AppointmentService.getByCustomerPhone(customerPhone, tenantId);

        res.status(200).json({ appointments: appointments || [] });
        
    } catch (error) {
        console.error('❌ Erro ao listar agendamentos:', error);
        res.status(500).json({ 
            message: 'Erro ao listar agendamentos: ' + error.message,
            error: error.message
        });
    }
});

// Endpoint publico para cancelar agendamento
router.post('/cancel', async (req, res) => {
    try {
        const { appointmentId, customerPhone, tenantId } = req.body;

        if (!appointmentId || !customerPhone || !tenantId) {
            return res.status(400).json({ message: 'Campos obrigatórios: appointmentId, customerPhone, tenantId' });
        }

        // appointmentId deve ser inteiro positivo (prevenção de SQL injection)
        const apptId = Number(appointmentId);
        if (!Number.isInteger(apptId) || apptId <= 0) {
            return res.status(400).json({ message: 'appointmentId inválido.' });
        }

        const deleted = await Appointment.destroy({
            where: {
                id: apptId,
                customerPhone,
                tenantId
            }
        });

        if (!deleted) {
            return res.status(404).json({ message: 'Agendamento não encontrado ou já removido.' });
        }

        res.status(200).json({ message: 'Agendamento excluído com sucesso' });
        
    } catch (error) {
        console.error('Erro ao excluir agendamento:', error);
        res.status(500).json({ message: 'Erro ao excluir agendamento: ' + error.message });
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

        // Valida formato da data
        const dateOnly = String(date).split('T')[0];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
            return res.status(400).json({ message: 'Formato de data inválido. Use YYYY-MM-DD.' });
        }
        const parsedDate = new Date(dateOnly + 'T00:00:00');
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ message: 'Data inválida.' });
        }

        // Bloqueia datas no passado
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (parsedDate < today) {
            return res.status(200).json({ availableTimes: [], overflowTimes: [], serviceDuration: 30 });
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

// Endpoint de teste
router.post('/test', (req, res) => {
    console.log('✅ Endpoint de teste funcionando!');
    res.json({ 
        success: true, 
        message: 'Endpoint de teste funcionando',
        received: req.body 
    });
});

module.exports = router;