const Appointment = require('../models/Appointment');
const Customer = require('../models/Customer');
const Service = require('../models/Service');
const User = require('../models/User'); // Use User em vez de Professional
const sequelize = require('../config/db');
const { QueryTypes, Op } = require('sequelize');

const APPOINTMENT_STATUS = Object.freeze({
    PENDENTE: 'pendente',
    AGENDADO: 'agendado',
    CANCELADO: 'cancelado',
    CONCLUIDO: 'concluido',
});

class AppointmentService {
    // Consulta para relatório de agendamentos (usado pelo mobile)
    static async getAllForReport({ tenantId, where = {}, startDate, endDate }) {
        try {
            console.log('🔍 AppointmentService.getAllForReport chamado');
            console.log('Parâmetros:', { tenantId, startDate, endDate });
            
            const query = {
                where: { ...where, tenantId },
                include: [
                    {
                        model: Customer,
                        as: 'customer',
                        attributes: ['id', 'phone', 'name', 'birthDate']
                    },
                    {
                        model: Service,
                        as: 'service',
                        attributes: ['id', 'name', 'price', 'duration']
                    },
                    {
                        model: User,
                        as: 'professional',
                        attributes: ['id', 'name']
                    }
                ],
                order: [['appointmentDate', 'DESC'], ['appointmentTime', 'DESC']]
            };
            
            if (startDate && endDate) {
                query.where.appointmentDate = { [Op.gte]: startDate, [Op.lte]: endDate };
            }
            
            console.log('Query executando...');
            const appointments = await Appointment.findAll(query);
            console.log(`✅ Encontrados ${appointments.length} agendamentos`);
            
            return appointments;
        } catch (error) {
            console.error('❌ Erro em getAllForReport:', error);
            // Se falhar com Professional, tenta sem o include do profissional
            if (error.message.includes('professional')) {
                console.log('⚠️ Tentando sem o include do profissional...');
                const query = {
                    where: { ...where, tenantId },
                    include: [
                        {
                            model: Customer,
                            as: 'customer',
                            attributes: ['id', 'phone', 'name', 'birthDate']
                        },
                        {
                            model: Service,
                            as: 'service',
                            attributes: ['id', 'name', 'price', 'duration']
                        }
                    ],
                    order: [['appointmentDate', 'DESC'], ['appointmentTime', 'DESC']]
                };
                
                if (startDate && endDate) {
                    query.where.appointmentDate = { [Op.gte]: startDate, [Op.lte]: endDate };
                }
                
                const appointments = await Appointment.findAll(query);
                console.log(`✅ Encontrados ${appointments.length} agendamentos (sem profissional)`);
                return appointments;
            }
            throw error;
        }
    }

    // Método getAll com paginação
    static async getAll({ tenantId, page = 1, limit = 20 }) {
        const offset = (page - 1) * limit;
        
        try {
            const { rows, count } = await Appointment.findAndCountAll({
                where: { tenantId },
                include: [
                    {
                        model: Customer,
                        as: 'customer',
                        attributes: ['phone', 'name', 'birthDate']
                    },
                    {
                        model: Service,
                        as: 'service',
                        attributes: ['id', 'name', 'price', 'duration']
                    },
                    {
                        model: User,
                        as: 'professional',
                        attributes: ['id', 'name']
                    }
                ],
                offset,
                limit,
                order: [['appointmentDate', 'DESC'], ['appointmentTime', 'DESC']]
            });
            
            return { appointments: rows, total: count, page, limit };
            
        } catch (error) {
            // Se a tabela de profissionais não existir, tenta sem ela
            if (error.message.includes('professional')) {
                const { rows, count } = await Appointment.findAndCountAll({
                    where: { tenantId },
                    include: [
                        {
                            model: Customer,
                            as: 'customer',
                            attributes: ['phone', 'name', 'birthDate']
                        },
                        {
                            model: Service,
                            as: 'service',
                            attributes: ['id', 'name', 'price', 'duration']
                        }
                    ],
                    offset,
                    limit,
                    order: [['appointmentDate', 'DESC'], ['appointmentTime', 'DESC']]
                });
                
                return { appointments: rows, total: count, page, limit };
            }
            throw error;
        }
    }

    static async create(data, tenantId) {
        let appointmentDate = data.appointmentDate;
        let appointmentTime = data.appointmentTime;

        if (data.date && (!appointmentDate || !appointmentTime)) {
            const [datePart, timePart] = String(data.date).split('T');
            if (datePart) {
                appointmentDate = datePart;
            }
            if (timePart) {
                appointmentTime = timePart.slice(0, 8);
            }
        }

        return await Appointment.create({
            customerPhone: data.customerPhone,
            serviceId: data.serviceId,
            professionalId: data.professionalId,
            appointmentDate,
            appointmentTime,
            status: data.status || APPOINTMENT_STATUS.AGENDADO,
            tenantId
        });
    }

    static async delete(id, tenantId) {
        return await Appointment.destroy({ where: { id, tenantId } });
    }

    static async deleteByCustomer(id, customerPhone, tenantId) {
        return await Appointment.destroy({ where: { id, tenantId, customerPhone } });
    }

    static async deleteByProfessional(id, professionalId, tenantId) {
        return await Appointment.destroy({ where: { id, tenantId, professionalId } });
    }

    static async update(id, data, tenantId) {
        await Appointment.update(data, { where: { id, tenantId } });
        
        return await Appointment.findOne({ 
            where: { id, tenantId },
            include: [
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['phone', 'name', 'birthDate']
                },
                {
                    model: Service,
                    as: 'service',
                    attributes: ['id', 'name', 'price', 'duration']
                },
                {
                    model: User,
                    as: 'professional',
                    attributes: ['id', 'name']
                }
            ]
        });
    }

    static async updateStatusByProfessional(id, professionalId, tenantId, nextStatus, allowedCurrentStatuses = [APPOINTMENT_STATUS.PENDENTE, APPOINTMENT_STATUS.AGENDADO]) {
        const [updatedCount] = await Appointment.update(
            { status: nextStatus },
            {
                where: {
                    id,
                    tenantId,
                    professionalId,
                    status: allowedCurrentStatuses,
                },
            }
        );
        return updatedCount > 0;
    }

    static async updateStatus(id, tenantId, nextStatus, allowedCurrentStatuses = [APPOINTMENT_STATUS.PENDENTE, APPOINTMENT_STATUS.AGENDADO]) {
        const [updatedCount] = await Appointment.update(
            { status: nextStatus },
            {
                where: {
                    id,
                    tenantId,
                    status: allowedCurrentStatuses,
                },
            }
        );
        return updatedCount > 0;
    }

    static async updateStatusByCustomer(id, customerPhone, tenantId, nextStatus, allowedCurrentStatuses = [APPOINTMENT_STATUS.PENDENTE, APPOINTMENT_STATUS.AGENDADO]) {
        const [updatedCount] = await Appointment.update(
            { status: nextStatus },
            {
                where: {
                    id,
                    tenantId,
                    customerPhone,
                    status: allowedCurrentStatuses,
                },
            }
        );
        return updatedCount > 0;
    }

    static async getByCustomerPhone(customerPhone, tenantId) {
        try {
            return await Appointment.findAll({
                where: { customerPhone, tenantId },
                include: [
                    {
                        model: Service,
                        as: 'service',
                        attributes: ['id', 'name', 'price', 'duration']
                    },
                    {
                        model: User,
                        as: 'professional',
                        attributes: ['id', 'name']
                    }
                ],
                order: [['appointmentDate', 'DESC'], ['appointmentTime', 'DESC']]
            });
        } catch (error) {
            if (error.message.includes('professional')) {
                return await Appointment.findAll({
                    where: { customerPhone, tenantId },
                    include: [
                        {
                            model: Service,
                            as: 'service',
                            attributes: ['id', 'name', 'price', 'duration']
                        }
                    ],
                    order: [['appointmentDate', 'DESC'], ['appointmentTime', 'DESC']]
                });
            }
            throw error;
        }
    }

    static async getAllGroupedByProfessional(tenantId, date) {
        const where = { tenantId };
        if (date) {
            where.appointmentDate = date;
        }

        const appointments = await Appointment.findAll({
            where,
            include: [
                {
                    model: Service,
                    as: 'service',
                    attributes: ['id', 'name', 'price', 'duration']
                },
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['phone', 'name']
                }
            ],
            order: [['professionalId', 'ASC'], ['appointmentTime', 'ASC']]
        });

        return appointments;
    }

    static async getByProfessional(professionalId, tenantId, date) {
        const where = { professionalId, tenantId };
        if (date) {
            where.appointmentDate = date;
        }

        const order = date
            ? [['appointmentTime', 'ASC']]
            : [['appointmentDate', 'ASC'], ['appointmentTime', 'ASC']];

        return await Appointment.findAll({
            where,
            include: [
                {
                    model: Service,
                    as: 'service',
                    attributes: ['id', 'name', 'price', 'duration']
                },
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['phone', 'name']
                }
            ],
            order
        });
    }

    static async getCompleted({ professionalId, tenantId, includeTenant = false, date = null }) {
        try {
            const result = await sequelize.query(
                `
                    SELECT
                        ca.id,
                        ca.appointment_id AS appointmentId,
                        ca.customer_phone AS customerPhone,
                        ca.professional_id AS professionalId,
                        ca.service_id AS serviceId,
                        ca.appointment_date AS appointmentDate,
                        ca.appointment_time AS appointmentTime,
                        ca.completed_at AS completedAt,
                        c.name AS customerName,
                        s.name AS serviceName,
                        u.name AS professionalName
                    FROM completed_appointments ca
                    LEFT JOIN customers c ON c.phone = ca.customer_phone
                    LEFT JOIN service s ON s.id = ca.service_id
                    LEFT JOIN user u ON u.id = ca.professional_id
                    WHERE ca.tenant_id = :tenantId
                      AND (:includeTenant = 1 OR ca.professional_id = :professionalId)
                      AND (:date IS NULL OR ca.appointment_date = :date)
                    ORDER BY ca.completed_at DESC
                `,
                {
                    replacements: {
                        tenantId,
                        professionalId,
                        includeTenant: includeTenant ? 1 : 0,
                        date: date || null,
                    },
                    type: QueryTypes.SELECT,
                }
            );

            return result;
        } catch (error) {
            if (error.message.includes('completed_appointments')) {
                return [];
            }
            throw error;
        }
    }

    static getAvailableStatuses() {
        return Object.values(APPOINTMENT_STATUS);
    }

    static isValidStatus(status) {
        return Object.values(APPOINTMENT_STATUS).includes(status);
    }
}

module.exports = AppointmentService;