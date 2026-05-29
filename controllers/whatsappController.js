const ReminderService = require('../services/reminderService');
const Tenant = require('../models/Tenant');

const evolutionFetch = async (path, options = {}) => {
    const baseUrl = process.env.EVOLUTION_API_URL;
    const apiKey  = process.env.EVOLUTION_API_KEY;
    if (!baseUrl || !apiKey) throw new Error('Evolution API não configurada.');
    return fetch(`${baseUrl}${path}`, {
        ...options,
        headers: { apikey: apiKey, 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
};

// Busca os dados da instância na Evolution API (v2: campo "name", não "instanceName")
const fetchInstanceData = async (instanceName) => {
    const r = await evolutionFetch('/instance/fetchInstances');
    const list = await r.json().catch(() => []);
    return Array.isArray(list) ? list.find(i => i.name === instanceName) : null;
};

// Tenta /instance/connect e retorna o objeto JSON. Se houver erro, retorna { _error: mensagem }
const connectAndGetQr = async (instanceName) => {
    const r = await evolutionFetch(`/instance/connect/${instanceName}`);
    const rawText = await r.text();
    let data = {};
    try { data = JSON.parse(rawText); } catch { data = {}; }
    console.log('[WhatsApp] Connect response:', rawText.slice(0, 300));
    if (data.error === true || r.status >= 400) {
        const msg = typeof data.message === 'string' ? data.message : JSON.stringify(data);
        return { _error: msg };
    }
    return data;
};

// GET /api/whatsapp/status
exports.getStatus = async (req, res) => {
    const instance = req.tenant?.slug || process.env.EVOLUTION_INSTANCE || 'meu-barbeiro';

    if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY) {
        return res.json({ configured: false, connected: false, provider: process.env.WHATSAPP_PROVIDER || 'evolution' });
    }

    try {
        let found = await fetchInstanceData(instance);

        // Se a instância ainda não existe, cria agora (desconectada)
        if (!found) {
            console.log(`[WhatsApp] Instância "${instance}" não encontrada — criando automaticamente...`);
            await evolutionFetch('/instance/create', {
                method: 'POST',
                body: JSON.stringify({ instanceName: instance, integration: 'WHATSAPP-BAILEYS' }),
            }).catch(() => {});
            found = await fetchInstanceData(instance).catch(() => null);
        }

        // Conectado = connectionStatus "open" + integração WHATSAPP-BAILEYS
        const connectionStatus = found?.connectionStatus || 'not_found';
        const connected = connectionStatus === 'open' && found?.integration === 'WHATSAPP-BAILEYS';

        res.json({
            configured: true,
            connected,
            state: connectionStatus,
            integration: found?.integration || null,
            instance,
            provider: 'evolution',
        });
    } catch (err) {
        res.json({ configured: true, connected: false, error: err.message, provider: 'evolution' });
    }
};

// GET /api/whatsapp/qrcode
exports.getQrCode = async (req, res) => {
    const instance = req.tenant?.slug || process.env.EVOLUTION_INSTANCE || 'meu-barbeiro';

    try {
        const existing = await fetchInstanceData(instance);

        // Já conectado — informa sem fazer nada
        if (existing?.connectionStatus === 'open' && existing?.integration === 'WHATSAPP-BAILEYS') {
            return res.json({ connected: true, message: 'WhatsApp já está conectado.' });
        }

        // Se o Baileys está em processo de conexão, tenta só obter o QR sem recriar
        if (existing?.connectionStatus === 'connecting') {
            const qrData = await connectAndGetQr(instance);
            if (!qrData._error) {
                const qrcode = qrData.base64 || qrData.qrcode?.base64 || qrData.code || null;
                if (qrcode) return res.json({ qrcode });
            }
        }

        // Em qualquer outro estado (close, not_found, erro do Baileys) — apaga e recria
        // Isso garante que o processo Baileys seja iniciado do zero
        if (existing) {
            console.log(`[WhatsApp] Apagando instância em estado "${existing.connectionStatus}" para recriar...`);
            await evolutionFetch(`/instance/delete/${instance}`, { method: 'DELETE' }).catch(() => {});
            await new Promise(ok => setTimeout(ok, 2000));
        }

        // Cria instância fresh (sem qrcode:true — causa erro 400 na v2)
        const createRes = await evolutionFetch('/instance/create', {
            method: 'POST',
            body: JSON.stringify({ instanceName: instance, integration: 'WHATSAPP-BAILEYS' }),
        });
        const createData = await createRes.json().catch(() => ({}));
        console.log('[WhatsApp] Instância criada:', JSON.stringify(createData).slice(0, 200));
        if (createRes.status >= 400) {
            return res.status(502).json({ message: `Falha ao criar instância: ${createData.message || JSON.stringify(createData)}` });
        }

        // Polling: tenta obter QR code por até 20 segundos (5 tentativas × 4s)
        for (let i = 1; i <= 5; i++) {
            await new Promise(ok => setTimeout(ok, 4000));
            console.log(`[WhatsApp] Tentativa ${i}/5 de obter QR code...`);
            const qrData = await connectAndGetQr(instance);
            if (qrData._error) {
                console.warn(`[WhatsApp] Tentativa ${i} falhou:`, qrData._error);
                continue;
            }
            const qrcode      = qrData.base64 || qrData.qrcode?.base64 || qrData.code || null;
            const pairingCode = qrData.pairingCode || null;
            if (qrcode || pairingCode) {
                console.log('[WhatsApp] QR code obtido com sucesso na tentativa', i);
                return res.json({ qrcode, pairingCode });
            }
        }

        return res.status(202).json({ message: 'QR code ainda não disponível. Clique em Atualizar em alguns segundos.' });

    } catch (err) {
        console.error('[WhatsApp] Erro no getQrCode:', err.message);
        res.status(500).json({ message: err.message });
    }
};

// POST /api/whatsapp/pairingcode
exports.getPairingCode = async (req, res) => {
    const instance = req.tenant?.slug || process.env.EVOLUTION_INSTANCE || 'meu-barbeiro';
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ message: 'Número de telefone obrigatório.' });

    const digits = String(phone).replace(/\D/g, '');
    const number = digits.startsWith('55') ? digits : `55${digits}`;
    if (number.length < 12) return res.status(400).json({ message: 'Número de telefone inválido.' });

    try {
        // Garante que a instância existe e está desconectada (pronta para parear)
        const existing = await fetchInstanceData(instance);
        if (existing?.connectionStatus === 'open') {
            return res.json({ connected: true, message: 'WhatsApp já está conectado.' });
        }

        // Se não existe, cria
        if (!existing) {
            await evolutionFetch('/instance/create', {
                method: 'POST',
                body: JSON.stringify({ instanceName: instance, integration: 'WHATSAPP-BAILEYS' }),
            });
            await new Promise(ok => setTimeout(ok, 2000));
        }

        // Solicita o pairing code para o número informado
        const r = await evolutionFetch(`/instance/pairingCode/${instance}`, {
            method: 'POST',
            body: JSON.stringify({ number }),
        });
        const rawText = await r.text();
        let data = {};
        try { data = JSON.parse(rawText); } catch { data = {}; }
        console.log('[WhatsApp] PairingCode response:', rawText.slice(0, 300));

        if (r.status >= 400) {
            return res.status(502).json({ message: data.message || 'Falha ao gerar código de pareamento.' });
        }

        const code = data.pairingCode || data.code || null;
        if (!code) return res.status(502).json({ message: 'Código não retornado pela API. Tente novamente.' });

        return res.json({ pairingCode: code });
    } catch (err) {
        console.error('[WhatsApp] getPairingCode error:', err.message);
        res.status(500).json({ message: err.message });
    }
};

// DELETE /api/whatsapp/disconnect
exports.disconnect = async (req, res) => {
    const instance = req.tenant?.slug || process.env.EVOLUTION_INSTANCE || 'meu-barbeiro';
    try {
        await evolutionFetch(`/instance/logout/${instance}`, { method: 'DELETE' });
        res.json({ message: 'Desconectado com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/whatsapp/reminder/test
exports.testReminder = async (req, res) => {
    try {
        await ReminderService.sendTomorrowReminders();
        res.json({ message: 'Lembretes disparados com sucesso.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Cria instâncias Evolution para todos os tenants ativos que ainda não têm uma
// Chamado no boot do servidor — garante que tenants existentes sejam provisionados
exports.provisionAllInstances = async () => {
    if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_API_KEY) return;

    try {
        const tenants = await Tenant.findAll({
            where: { isActive: true },
            attributes: ['id', 'slug'],
        });

        const r = await evolutionFetch('/instance/fetchInstances');
        const existing = await r.json().catch(() => []);
        const existingSlugs = new Set(
            Array.isArray(existing) ? existing.map(i => i.name) : []
        );

        let created = 0;
        for (const tenant of tenants) {
            if (!tenant.slug || existingSlugs.has(tenant.slug)) continue;
            try {
                await evolutionFetch('/instance/create', {
                    method: 'POST',
                    body: JSON.stringify({ instanceName: tenant.slug, integration: 'WHATSAPP-BAILEYS' }),
                });
                console.log(`[WhatsApp] Instância criada para tenant: ${tenant.slug}`);
                created++;
            } catch (e) {
                console.warn(`[WhatsApp] Falha ao criar instância para ${tenant.slug}:`, e.message);
            }
        }

        if (created > 0) {
            console.log(`[WhatsApp] ${created} instância(s) criada(s) para tenants existentes.`);
        } else {
            console.log('[WhatsApp] Todos os tenants já possuem instância na Evolution API.');
        }
    } catch (err) {
        console.warn('[WhatsApp] provisionAllInstances falhou (não crítico):', err.message);
    }
};
