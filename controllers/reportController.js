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
    // Verificar se req.tenant existe
    if (!req.tenant || !req.tenant.id) {
      console.error('❌ Tenant não encontrado na requisição');
      return res.status(401).json({ 
        success: false,
        message: 'Tenant não autenticado' 
      });
    }

    const tenantId = req.tenant.id;
    const { periodo, usuarioId, clienteId, servicoId } = req.query;

    console.log('📊 Gerando relatório:', { periodo, usuarioId, clienteId, servicoId, tenantId });

    if (!periodo) {
      return res.status(400).json({ 
        success: false,
        message: 'Período não informado' 
      });
    }

    // Calcular período
    const { startDate, endDate } = getDateRange(periodo);
    console.log('📅 Período:', { startDate, endDate });

    // Construir filtros
    const where = {
      tenantId,
      appointmentDate: {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      }
    };

    if (usuarioId && usuarioId !== '' && usuarioId !== 'undefined') {
      where.professionalId = parseInt(usuarioId);
    }

    if (servicoId && servicoId !== '' && servicoId !== 'undefined') {
      where.serviceId = parseInt(servicoId);
    }

    console.log('🔍 Filtros:', JSON.stringify(where, null, 2));

    // Verificar se AppointmentService existe
    if (!AppointmentService || typeof AppointmentService.getAllForReport !== 'function') {
      console.error('❌ AppointmentService.getAllForReport não está disponível');
      return res.status(500).json({ 
        success: false,
        message: 'Serviço de agendamento não disponível' 
      });
    }

    // Buscar agendamentos
    let appointments = [];
    try {
      appointments = await AppointmentService.getAllForReport({
        tenantId,
        where,
        startDate,
        endDate
      });
      console.log(`✅ Encontrados ${appointments?.length || 0} agendamentos`);
    } catch (dbError) {
      console.error('❌ Erro ao buscar agendamentos:', dbError);
      return res.status(500).json({ 
        success: false,
        message: 'Erro ao buscar dados no banco',
        error: dbError.message
      });
    }

    // Garantir que appointments é um array
    if (!appointments || !Array.isArray(appointments)) {
      appointments = [];
    }

    // Filtrar por cliente (usando customerPhone)
    if (clienteId && clienteId !== '' && clienteId !== 'undefined') {
      try {
        const Customer = require('../models/Customer');
        const customer = await Customer.findByPk(clienteId);
        if (customer) {
          appointments = appointments.filter(apt => apt.customerPhone === customer.phone);
          console.log(`✅ Filtrado por cliente: ${appointments.length} registros restantes`);
        }
      } catch (customerError) {
        console.error('❌ Erro ao filtrar por cliente:', customerError);
      }
    }

    // Formatar dados para o frontend
    const formattedData = appointments.map(apt => {
      try {
        // Garantir que apt existe e tem os métodos necessários
        const plain = apt && typeof apt.get === 'function' ? apt.get({ plain: true }) : (apt || {});
        
        return {
          id: plain.id || null,
          data: plain.appointmentDate || '',
          horario: plain.appointmentTime ? plain.appointmentTime.slice(0, 5) : '',
          cliente: {
            id: plain.customer?.id || null,
            nome: plain.customer?.name || plain.customer?.nome || 'Cliente não identificado',
            telefone: plain.customer?.phone || plain.customerPhone || ''
          },
          profissional: {
            id: plain.professional?.id || null,
            nome: plain.professional?.name || 'Profissional não identificado'
          },
          servico: {
            id: plain.service?.id || null,
            nome: plain.service?.name || 'Serviço não identificado',
            valor: parseFloat(plain.service?.price) || 0
          },
          valor: parseFloat(plain.service?.price) || 0,
          status: plain.status || 'concluido'
        };
      } catch (itemError) {
        console.error('❌ Erro ao formatar item:', itemError);
        return null;
      }
    }).filter(item => item !== null); // Remove itens que deram erro

    // Calcular totais
    const totalAgendamentos = formattedData.length;
    const valorTotal = formattedData.reduce((sum, item) => sum + (item.valor || 0), 0);
    const valorMedio = totalAgendamentos > 0 ? valorTotal / totalAgendamentos : 0;

    console.log(`✅ Relatório gerado com sucesso: ${totalAgendamentos} registros`);

    res.json({
      success: true,
      data: formattedData,
      summary: {
        total: totalAgendamentos,
        valorTotal: valorTotal,
        valorMedio: valorMedio,
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error('❌ Erro FATAL ao carregar relatório:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar relatório de agendamentos',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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