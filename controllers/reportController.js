const AppointmentService = require('../services/appointmentService');
const { Op } = require('sequelize');

// Função para calcular período
const getDateRange = (periodo) => {
  const hoje = new Date();
  const fim = new Date(hoje);
  let inicio = new Date(hoje);

  switch (periodo) {
    case 'diario':
      inicio.setHours(0, 0, 0, 0);
      fim.setHours(23, 59, 59, 999);
      break;
    case 'semanal':
      inicio.setDate(hoje.getDate() - 7);
      break;
    case 'quinzenal':
      inicio.setDate(hoje.getDate() - 15);
      break;
    case 'mensal':
      inicio.setMonth(hoje.getMonth() - 1);
      break;
    case 'trimestral':
      inicio.setMonth(hoje.getMonth() - 3);
      break;
    case 'semestral':
      inicio.setMonth(hoje.getMonth() - 6);
      break;
    case 'anual':
      inicio.setFullYear(hoje.getFullYear() - 1);
      break;
    default:
      inicio.setDate(hoje.getDate() - 30);
  }

  return {
    startDate: inicio.toISOString().split('T')[0],
    endDate: fim.toISOString().split('T')[0]
  };
};

// Endpoint para relatório de agendamentos
exports.getAppointments = async (req, res) => {
  try {
    if (!req.tenant || !req.tenant.id) {
      return res.status(401).json({ success: false, message: 'Tenant não autenticado' });
    }

    const tenantId = req.tenant.id;
    const { periodo, usuarioId, clientePhone, servicoId } = req.query;

    if (!periodo) {
      return res.status(400).json({ success: false, message: 'Período não informado' });
    }

    const { startDate, endDate } = getDateRange(periodo);
    console.log('📊 Relatório:', { tenantId, periodo, startDate, endDate, usuarioId, clientePhone, servicoId });

    const appointments = await AppointmentService.getAllForReport({
      tenantId,
      startDate,
      endDate,
      professionalId: usuarioId    && usuarioId    !== 'undefined' ? usuarioId    : null,
      serviceId:      servicoId    && servicoId    !== 'undefined' ? servicoId    : null,
      customerPhone:  clientePhone && clientePhone !== 'undefined' ? clientePhone : null,
    });

    const formattedData = (appointments || []).map(apt => {
      const plain = apt && typeof apt.get === 'function' ? apt.get({ plain: true }) : (apt || {});
      return {
        id: plain.id || null,
        data: plain.appointmentDate || '',
        horario: plain.appointmentTime ? String(plain.appointmentTime).slice(0, 5) : '',
        cliente: {
          id: plain.customer?.phone || plain.customerPhone || null,
          nome: plain.customer?.name || 'Cliente não identificado',
          telefone: plain.customer?.phone || plain.customerPhone || ''
        },
        profissional: {
          id: plain.professional?.id || null,
          nome: plain.professional?.name || 'Não informado'
        },
        servico: {
          id: plain.service?.id || null,
          nome: plain.service?.name || 'Não informado',
          valor: parseFloat(plain.service?.price) || 0
        },
        valor: parseFloat(plain.service?.price) || 0,
        status: plain.status || 'agendado'
      };
    });

    const totalAgendamentos = formattedData.length;
    const valorTotal = formattedData.reduce((s, i) => s + (i.valor || 0), 0);
    const valorMedio = totalAgendamentos > 0 ? valorTotal / totalAgendamentos : 0;

    console.log(`✅ Relatório: ${totalAgendamentos} registros`);

    res.json({
      success: true,
      data: formattedData,
      summary: { total: totalAgendamentos, valorTotal, valorMedio, startDate, endDate }
    });

  } catch (error) {
    console.error('❌ Erro ao carregar relatório:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar agendamentos. Verifique se o banco de dados está atualizado.',
      error: error.message
    });
  }
};

exports.getAll = async (req, res) => {
  try {
    res.json({ 
      success: true,
      message: 'GET /api/report funcionando' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

exports.create = async (req, res) => {
  try {
    res.json({ 
      success: true,
      message: 'POST /api/report funcionando' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

exports.update = async (req, res) => {
  try {
    res.json({ 
      success: true,
      message: 'PUT /api/report/:id funcionando' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

exports.delete = async (req, res) => {
  try {
    res.json({ 
      success: true,
      message: 'DELETE /api/report/:id funcionando' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};