const SupportTicket = require('../models/SupportTicket');
const TicketMessage  = require('../models/TicketMessage');

// Envia mensagem de texto via Evolution API (falha silenciosa)
const notifyWhatsApp = async (text) => {
    const baseUrl = process.env.EVOLUTION_API_URL;
    const apiKey  = process.env.EVOLUTION_API_KEY;
    const instance = process.env.EVOLUTION_INSTANCE || 'meu-barbeiro';
    const number   = process.env.SUPPORT_WHATSAPP   || '5579991071656';
    if (!baseUrl || !apiKey) return;
    try {
        const r = await fetch(`${baseUrl}/message/sendText/${instance}`, {
            method: 'POST',
            headers: { apikey: apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ number, text }),
        });
        const raw = await r.text();
        console.log(`[support] WA notify → ${r.status}: ${raw.slice(0, 120)}`);
    } catch (err) {
        console.warn('[support] WA notify falhou (não crítico):', err.message);
    }
};

const CATEGORY_LABELS = {
    login: 'Login / Acesso',
    whatsapp: 'WhatsApp',
    agendamento: 'Agendamentos',
    clientes: 'Clientes / Usuários',
    configuracoes: 'Configurações',
    pagamento: 'Pagamento / Cobrança',
    other: 'Outro',
};

// POST /api/support/ticket — abre chamado (tenant autenticado)
exports.createTicket = async (req, res) => {
    const { category = 'other', description, chatHistory = [] } = req.body || {};
    if (!description?.trim()) return res.status(400).json({ message: 'Descreva o problema.' });

    try {
        const ticket = await SupportTicket.create({
            tenantId:  req.user.tenantId,
            userId:    req.user.id   || null,
            userName:  req.user.name  || null,
            userEmail: req.user.email || null,
            category,
        });

        // Salva histórico do bot como mensagens
        for (const msg of chatHistory) {
            if (msg.sender && msg.content) {
                await TicketMessage.create({ ticketId: ticket.id, sender: msg.sender, content: msg.content });
            }
        }
        // Mensagem final do usuário
        await TicketMessage.create({ ticketId: ticket.id, sender: 'user', content: description });

        // Notifica admin via WhatsApp automaticamente
        const catLabel = CATEGORY_LABELS[category] || category;
        const waMsg = [
            `🔔 *Novo Chamado #${ticket.id} — Barbeiro ON*`,
            `📋 Categoria: ${catLabel}`,
            `👤 Usuário: ${req.user.email || 'desconhecido'}`,
            ``,
            `💬 ${description.slice(0, 300)}${description.length > 300 ? '...' : ''}`,
        ].join('\n');
        notifyWhatsApp(waMsg); // fire-and-forget

        return res.status(201).json({ ticket: { id: ticket.id, status: ticket.status } });
    } catch (err) {
        console.error('[support] createTicket:', err.message);
        res.status(500).json({ message: 'Erro interno.' });
    }
};

// GET /api/support/ticket — lista chamados do tenant
exports.listTickets = async (req, res) => {
    try {
        const tickets = await SupportTicket.findAll({
            where: { tenantId: req.user.tenantId },
            order: [['created_at', 'DESC']],
            limit: 20,
        });
        res.json({ tickets });
    } catch (err) {
        res.status(500).json({ message: 'Erro interno.' });
    }
};

// ── Gestor ────────────────────────────────────────────────────────────────────

// GET /api/gestor/support/tickets
exports.gestorListTickets = async (req, res) => {
    const { status, page = 1 } = req.query;
    const where = status ? { status } : {};
    try {
        const { count, rows } = await SupportTicket.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit: 50,
            offset: (Number(page) - 1) * 50,
        });
        res.json({ total: count, tickets: rows });
    } catch (err) {
        res.status(500).json({ message: 'Erro interno.' });
    }
};

// GET /api/gestor/support/tickets/:id
exports.gestorGetTicket = async (req, res) => {
    try {
        const ticket = await SupportTicket.findByPk(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Chamado não encontrado.' });
        const messages = await TicketMessage.findAll({ where: { ticketId: ticket.id }, order: [['created_at', 'ASC']] });
        res.json({ ticket, messages });
    } catch (err) {
        res.status(500).json({ message: 'Erro interno.' });
    }
};

// PATCH /api/gestor/support/tickets/:id/status
exports.gestorUpdateStatus = async (req, res) => {
    const { status } = req.body || {};
    const allowed = ['open','attending','paused','resolved','canceled'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Status inválido.' });
    try {
        const ticket = await SupportTicket.findByPk(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Chamado não encontrado.' });
        const closedAt = ['resolved','canceled'].includes(status) ? new Date() : null;
        await ticket.update({ status, closedAt });
        res.json({ ticket });
    } catch (err) {
        res.status(500).json({ message: 'Erro interno.' });
    }
};

// POST /api/gestor/support/tickets/:id/reply
exports.gestorReply = async (req, res) => {
    const { content } = req.body || {};
    if (!content?.trim()) return res.status(400).json({ message: 'Mensagem vazia.' });
    try {
        const ticket = await SupportTicket.findByPk(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Chamado não encontrado.' });
        const msg = await TicketMessage.create({ ticketId: ticket.id, sender: 'gestor', content: content.trim() });
        if (ticket.status === 'open') await ticket.update({ status: 'attending' });
        res.json({ message: msg });
    } catch (err) {
        res.status(500).json({ message: 'Erro interno.' });
    }
};

// GET /api/gestor/support/reports
exports.gestorReports = async (req, res) => {
    try {
        const [rows] = await SupportTicket.sequelize.query(`
            SELECT
                status,
                category,
                COUNT(*) AS total,
                DATE(created_at) AS date
            FROM support_tickets
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY status, category, DATE(created_at)
            ORDER BY date DESC
        `);
        const summary = { open: 0, attending: 0, paused: 0, resolved: 0, canceled: 0 };
        const byCategory = {};
        for (const r of rows) {
            summary[r.status] = (summary[r.status] || 0) + Number(r.total);
            byCategory[r.category] = (byCategory[r.category] || 0) + Number(r.total);
        }
        res.json({ summary, byCategory, raw: rows });
    } catch (err) {
        res.status(500).json({ message: 'Erro interno.' });
    }
};
