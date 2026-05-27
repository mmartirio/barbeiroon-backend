const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const parts = String(dateStr).split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
};

class WhatsAppService {
    static normalizePhone(phone) {
        if (!phone) return null;
        const digits = String(phone).replace(/\D/g, '');
        if (!digits) return null;
        return digits.startsWith('55') ? digits : `55${digits}`;
    }

    // Roteador principal — escolhe o provedor pelo env WHATSAPP_PROVIDER
    static async _send(to, message) {
        const provider = String(process.env.WHATSAPP_PROVIDER || 'evolution').toLowerCase();
        switch (provider) {
            case 'evolution':  return this.sendViaEvolution(to, message);
            case 'meta':       return this.sendViaMeta(to, message);
            case 'callmebot':  return this.sendViaCallMeBot(to, message);
            default:           return { success: false, skipped: true, reason: 'unknown-provider' };
        }
    }

    // ─── Mensagens de negócio ─────────────────────────────────────────────────

    static async sendConfirmationMessage({ to, customerName, serviceName, professionalName, appointmentDate, appointmentTime, servicePrice }) {
        const phone = this.normalizePhone(to);
        if (!phone) return { success: false, skipped: true, reason: 'no-phone' };

        const priceFormatted = servicePrice != null
            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(servicePrice))
            : null;

        const message = [
            '✅ *Agendamento Confirmado!*',
            '',
            `Olá, ${customerName || 'cliente'}! Seu agendamento foi confirmado.`,
            '',
            `📅 Data: ${formatDate(appointmentDate)}`,
            `⏰ Horário: ${appointmentTime || '-'}`,
            `✂️ Serviço: ${serviceName || '-'}`,
            ...(priceFormatted ? [`💰 Valor: ${priceFormatted}`] : []),
            `👨 Profissional: ${professionalName || '-'}`,
            '',
            'Em caso de dúvidas, entre em contato conosco.',
        ].join('\n');

        return this._send(phone, message);
    }

    static async sendReminderMessage({ to, customerName, serviceName, professionalName, appointmentDate, appointmentTime }) {
        const phone = this.normalizePhone(to);
        if (!phone) return { success: false, skipped: true, reason: 'no-phone' };

        const message = [
            '⏰ *Lembrete de Agendamento*',
            '',
            `Olá, ${customerName || 'cliente'}! Você tem um agendamento amanhã.`,
            '',
            `📅 Data: ${formatDate(appointmentDate)}`,
            `⏰ Horário: ${appointmentTime || '-'}`,
            `✂️ Serviço: ${serviceName || '-'}`,
            `👨 Profissional: ${professionalName || '-'}`,
            '',
            'Até logo! 😊',
        ].join('\n');

        return this._send(phone, message);
    }

    static async sendCancellationMessage({ to, customerName, appointmentDate, appointmentTime, reason }) {
        const phone = this.normalizePhone(to);
        if (!phone) return { success: false, skipped: true, reason: 'no-phone' };

        const lines = [
            '❌ *Agendamento Cancelado*',
            '',
            `Olá, ${customerName || 'cliente'}. Seu agendamento foi cancelado.`,
            '',
            `📅 Data: ${formatDate(appointmentDate)}`,
            `⏰ Horário: ${appointmentTime || '-'}`,
        ];
        if (reason) {
            lines.push('', `📋 Motivo: ${reason}`);
        }
        lines.push('', 'Entre em contato para reagendar.');
        const message = lines.join('\n');

        return this._send(phone, message);
    }

    // Mantida para compatibilidade — envia resumo do atendimento ao tenant
    static async sendCompletionMessage({ to, barberName, customerName, customerPhone, serviceName, appointmentDate, appointmentTime }) {
        const normalizedTo = this.normalizePhone(to);
        const message = this.buildCompletionText({ barberName, customerName, customerPhone, serviceName, appointmentDate, appointmentTime });
        const redirectUrl = this.buildRedirectUrl(normalizedTo, message);

        if (!normalizedTo) {
            return { success: false, skipped: true, reason: 'no-recipient-phone', redirectUrl: null };
        }

        const result = await this._send(normalizedTo, message);
        return { ...result, redirectUrl };
    }

    // ─── Provedores ───────────────────────────────────────────────────────────

    static async sendViaEvolution(to, message) {
        const baseUrl = process.env.EVOLUTION_API_URL;
        const apiKey  = process.env.EVOLUTION_API_KEY;
        const instance = process.env.EVOLUTION_INSTANCE || 'meu-barbeiro';

        if (!baseUrl || !apiKey) {
            return { success: false, skipped: true, reason: 'missing-evolution-config' };
        }

        try {
            const response = await fetch(`${baseUrl}/message/sendText/${instance}`, {
                method: 'POST',
                headers: { apikey: apiKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({ number: to, text: message }),
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                return { success: false, provider: 'evolution', status: response.status, payload };
            }

            return { success: true, provider: 'evolution' };
        } catch (err) {
            return { success: false, provider: 'evolution', error: err.message };
        }
    }

    static async sendViaCallMeBot(to, message) {
        const apiKey = process.env.WHATSAPP_CALLMEBOT_API_KEY;
        if (!apiKey) {
            return { success: false, skipped: true, reason: 'missing-callmebot-api-key' };
        }

        const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(to)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apiKey)}`;
        const response = await fetch(url, { method: 'GET' });
        const body = await response.text().catch(() => '');

        if (!response.ok) {
            return { success: false, status: response.status, body };
        }

        return { success: true, provider: 'callmebot' };
    }

    static async sendViaMeta(to, message) {
        const token = process.env.WHATSAPP_ACCESS_TOKEN;
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

        if (!token || !phoneNumberId) {
            return { success: false, skipped: true, reason: 'missing-meta-config' };
        }

        const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: { body: message },
            }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            return { success: false, status: response.status, payload };
        }

        return { success: true, provider: 'meta', payload };
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    static buildCompletionText({ barberName, customerName, customerPhone, serviceName, appointmentDate, appointmentTime }) {
        return [
            'Atendimento concluido',
            `Barbeiro: ${barberName || '-'}`,
            `Cliente: ${customerName || '-'} (${customerPhone || '-'})`,
            `Servico: ${serviceName || '-'}`,
            `Data: ${appointmentDate || '-'} ${appointmentTime || '-'}`,
        ].join('\n');
    }

    static buildRedirectUrl(to, message) {
        if (!to || !message) return null;
        return `https://wa.me/${encodeURIComponent(to)}?text=${encodeURIComponent(message)}`;
    }
}

module.exports = WhatsAppService;
