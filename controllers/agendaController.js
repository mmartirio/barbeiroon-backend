const AgendaSettings = require('../models/AgendaSettings');
const User = require('../models/User');

// Handler para salvar expediente
exports.saveExpediente = async (req, res) => {
	try {
		const tenantId = req.tenant?.id;
		const {
			diasCalendario = [],
			diasSelecionados = [],
			inicioExpediente,
			fimExpediente,
			inicioAlmoco,
			fimAlmoco,
			professionalId,
			applyToAll
		} = req.body;

		if (!tenantId) {
			return res.status(400).json({ message: 'TenantId e obrigatorio.' });
		}
		if (!inicioExpediente || !fimExpediente) {
			return res.status(400).json({ message: 'Inicio e fim do expediente sao obrigatorios.' });
		}

		const payload = {
			tenantId,
			professionalId: professionalId || null,
			inicioExpediente,
			fimExpediente,
			inicioAlmoco: inicioAlmoco || null,
			fimAlmoco: fimAlmoco || null,
			diasCalendario: Array.isArray(diasCalendario) ? JSON.stringify(diasCalendario) : null,
			diasSelecionados: Array.isArray(diasSelecionados) ? JSON.stringify(diasSelecionados) : null
		};

		if (applyToAll) {
			const users = await User.findAll({
				where: { tenantId, isBarber: true },
				attributes: ['id']
			});
			if (!users.length) {
				return res.status(400).json({ message: 'Nenhum barbeiro encontrado para aplicar o expediente.' });
			}

			for (const user of users) {
				const userPayload = { ...payload, professionalId: user.id };
				const existingUser = await AgendaSettings.findOne({
					where: {
						tenantId,
						professionalId: user.id
					}
				});
				if (existingUser) {
					await existingUser.update(userPayload);
				} else {
					await AgendaSettings.create(userPayload);
				}
			}

			return res.status(200).json({ message: 'Expediente salvo para todos os barbeiros.' });
		}

		const existing = await AgendaSettings.findOne({
			where: {
				tenantId,
				professionalId: professionalId || null
			}
		});

		if (existing) {
			await existing.update(payload);
		} else {
			await AgendaSettings.create(payload);
		}

		res.status(200).json({ message: 'Expediente salvo com sucesso!' });
	} catch (error) {
		console.error('Erro ao salvar expediente:', error);
		res.status(500).json({ message: 'Nao foi possivel salvar o expediente.' });
	}
};
const Indisponibilidade = require('../models/Indisponibilidade');
const EncerramentoAntecipado = require('../models/EncerramentoAntecipado');


exports.saveIndisponibilidade = async (req, res) => {
	const { dia, inicio, fim, motivo } = req.body;
	if (!dia || !inicio || !fim || !motivo) {
		return res.status(400).json({ message: 'Por favor, preencha todos os campos: dia, início, fim e motivo da indisponibilidade.' });
	}
	// Validação de formato básico
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
		return res.status(400).json({ message: 'A data informada está em formato inválido. Use o formato AAAA-MM-DD.' });
	}
	if (!/^\d{2}:\d{2}$/.test(inicio) || !/^\d{2}:\d{2}$/.test(fim)) {
		return res.status(400).json({ message: 'O horário de início ou fim está em formato inválido. Use o formato HH:MM.' });
	}
	try {
		await Indisponibilidade.create({ dia, inicio, fim, motivo });
		res.status(201).json({ message: 'Indisponibilidade salva com sucesso!' });
	} catch (error) {
		res.status(500).json({ message: 'Não foi possível salvar a indisponibilidade. Tente novamente ou contate o suporte.', error: error.message });
	}
};


exports.saveEncerramentoAntecipado = async (req, res) => {
	const { dia, hora, motivo } = req.body;
	if (!dia || !hora || !motivo) {
		return res.status(400).json({ message: 'Por favor, preencha todos os campos: dia, hora e motivo do encerramento antecipado.' });
	}
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
		return res.status(400).json({ message: 'A data informada está em formato inválido. Use o formato AAAA-MM-DD.' });
	}
	if (!/^\d{2}:\d{2}$/.test(hora)) {
		return res.status(400).json({ message: 'O horário informado está em formato inválido. Use o formato HH:MM.' });
	}
	try {
		await EncerramentoAntecipado.create({ dia, hora, motivo });
		res.status(201).json({ message: 'Encerramento antecipado salvo com sucesso!' });
	} catch (error) {
		res.status(500).json({ message: 'Não foi possível salvar o encerramento antecipado. Tente novamente ou contate o suporte.', error: error.message });
	}
};

