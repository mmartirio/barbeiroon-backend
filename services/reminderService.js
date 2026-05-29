const Appointment = require('../models/Appointment');
const Customer = require('../models/Customer');
const Service = require('../models/Service');
const Professional = require('../models/Professional');
const Tenant = require('../models/Tenant');
const WhatsAppService = require('./whatsappService');
const { Op } = require('sequelize');

class ReminderService {
    static start() {
        this._scheduleNext();
        console.log('📅 ReminderService: lembretes diários configurados (09:00)');
    }

    // Agenda o próximo disparo às 09:00 no fuso do servidor (TZ=America/Sao_Paulo)
    static _scheduleNext() {
        const now = new Date();
        const next = new Date(now);
        next.setHours(9, 0, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 1);

        const delay = next.getTime() - now.getTime();

        setTimeout(() => {
            this.sendTomorrowReminders().catch((err) => {
                console.error('❌ ReminderService erro:', err.message);
            });
            this._scheduleNext();
        }, delay);
    }

    static _tomorrowDateStr() {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    static async sendTomorrowReminders() {
        const dateStr = this._tomorrowDateStr();
        console.log(`📲 ReminderService: enviando lembretes para ${dateStr}...`);

        let appointments = [];

        try {
            appointments = await Appointment.findAll({
                where: {
                    appointmentDate: dateStr,
                    status: { [Op.in]: ['agendado', 'pendente'] },
                },
                include: [
                    { model: Customer, as: 'customer', attributes: ['name', 'phone'] },
                    { model: Service, as: 'service', attributes: ['name'] },
                    { model: Professional, as: 'professional', attributes: ['name'] },
                    { model: Tenant, as: 'tenant', attributes: ['slug'] },
                ],
            });
        } catch {
            // Fallback sem Professional caso a tabela não exista
            appointments = await Appointment.findAll({
                where: {
                    appointmentDate: dateStr,
                    status: { [Op.in]: ['agendado', 'pendente'] },
                },
                include: [
                    { model: Customer, as: 'customer', attributes: ['name', 'phone'] },
                    { model: Service, as: 'service', attributes: ['name'] },
                    { model: Tenant, as: 'tenant', attributes: ['slug'] },
                ],
            });
        }

        let sent = 0;
        let skipped = 0;

        for (const appt of appointments) {
            const plain = typeof appt.get === 'function' ? appt.get({ plain: true }) : appt;
            const phone = plain.customer?.phone;

            if (!phone) { skipped++; continue; }

            try {
                const result = await WhatsAppService.sendReminderMessage({
                    to: phone,
                    customerName: plain.customer?.name,
                    serviceName: plain.service?.name,
                    professionalName: plain.professional?.name,
                    appointmentDate: plain.appointmentDate,
                    appointmentTime: String(plain.appointmentTime || '').slice(0, 5),
                    instanceName: plain.tenant?.slug,
                });

                if (result?.success) sent++;
                else skipped++;
            } catch {
                skipped++;
            }
        }

        console.log(`✅ ReminderService: ${sent} enviados, ${skipped} ignorados (${appointments.length} agendamentos amanhã)`);
    }
}

module.exports = ReminderService;
