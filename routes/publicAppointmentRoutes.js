const express = require('express');
const router = express.Router();
const AppointmentService = require('../services/appointmentService');
const CustomerService = require('../services/customerService');

/**
 * Endpoint público para criar agendamento
 * Não requer autenticação, mas requer tenantId e customerPhone válidos
 */
router.post('/create', async (req, res) => {
    try {
        const { customerPhone, serviceId, professionalId, date, tenantId } = req.body;

        // Validações
        if (!customerPhone || !serviceId || !professionalId || !date || !tenantId) {
            return res.status(400).json({ 
                message: 'Dados incompletos. Campos obrigatórios: customerPhone, serviceId, professionalId, date, tenantId' 
            });
        }

        // Verifica se o cliente existe
        const customer = await CustomerService.getCustomerByPhone(customerPhone, tenantId);
        if (!customer) {
            return res.status(404).json({ 
                message: 'Cliente não encontrado. Por favor, cadastre-se primeiro.' 
            });
        }

        // Cria o agendamento
        const appointment = await AppointmentService.create({
            customerPhone,
            serviceId,
            professionalId,
            date,
            status: 'Scheduled'
        }, tenantId);

        res.status(201).json({ 
            message: 'Agendamento criado com sucesso!',
            appointment 
        });
    } catch (error) {
        console.error('Erro ao criar agendamento público:', error);
        res.status(500).json({ message: 'Erro ao criar agendamento' });
    }
});

/**
 * Endpoint público para listar horários disponíveis
 */
router.get('/available-times', async (req, res) => {
    try {
        const { professionalId, date, tenantId } = req.query;

        if (!professionalId || !date || !tenantId) {
            return res.status(400).json({ 
                message: 'Parâmetros obrigatórios: professionalId, date, tenantId' 
            });
        }

        // Aqui você implementaria a lógica de horários disponíveis
        // Por enquanto, retorna horários de exemplo
        const availableTimes = [
            '08:00', '08:30', '09:00', '09:30', '10:00', 
            '10:30', '11:00', '11:30', '14:00', '14:30',
            '15:00', '15:30', '16:00', '16:30', '17:00'
        ];

        res.status(200).json({ availableTimes });
    } catch (error) {
        console.error('Erro ao buscar horários disponíveis:', error);
        res.status(500).json({ message: 'Erro ao buscar horários disponíveis' });
    }
});

module.exports = router;
