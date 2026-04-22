class WhatsAppService {
    static normalizePhone(phone) {
        if (!phone) return null;
        const digits = String(phone).replace(/\D/g, '');
        if (!digits) return null;
        if (digits.startsWith('55')) return digits;
        return `55${digits}`;
    }

    static async sendCompletionMessage({ to, barberName, customerName, customerPhone, serviceName, appointmentDate, appointmentTime }) {
        const normalizedTo = this.normalizePhone(to);
        const message = this.buildCompletionText({ barberName, customerName, customerPhone, serviceName, appointmentDate, appointmentTime });
        const redirectUrl = this.buildRedirectUrl(normalizedTo, message);

        if (!normalizedTo) {
            return { success: false, skipped: true, reason: 'no-recipient-phone', redirectUrl: null };
        }

        const provider = String(process.env.WHATSAPP_PROVIDER || 'callmebot').toLowerCase();

        if (provider === 'meta') {
            const metaResult = await this.sendViaMeta(normalizedTo, message);
            return { ...metaResult, redirectUrl };
        }

        const callMeBotResult = await this.sendViaCallMeBot(normalizedTo, message);
        return { ...callMeBotResult, redirectUrl };
    }

    static buildCompletionText({ barberName, customerName, customerPhone, serviceName, appointmentDate, appointmentTime }) {
        return [
            'Atendimento concluido',
            `Barbeiro: ${barberName || '-'}`,
            `Cliente: ${customerName || '-'} (${customerPhone || '-'})`,
            `Servico: ${serviceName || '-'}`,
            `Data: ${appointmentDate || '-'} ${appointmentTime || '-'}`
        ].join('\n');
    }

    static buildRedirectUrl(to, message) {
        if (!to || !message) return null;
        return `https://wa.me/${encodeURIComponent(to)}?text=${encodeURIComponent(message)}`;
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
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: { body: message }
            })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            return { success: false, status: response.status, payload };
        }

        return { success: true, provider: 'meta', payload };
    }
}

module.exports = WhatsAppService;
