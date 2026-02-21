// Handler básico para salvar expediente (placeholder)
exports.saveExpediente = async (req, res) => {
	// Aqui você pode validar e salvar o expediente no banco futuramente
	// Por enquanto, apenas retorna sucesso para o frontend
	res.status(200).json({ message: 'Expediente salvo com sucesso!' });
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

