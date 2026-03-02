const Appointment = require('../models/Appointment');
const Customer = require('../models/Customer');
const Service = require('../models/Service');
const Professional = require('../models/Professional');

class AppointmentService {
    static async getAll({ tenantId, page = 1, limit = 10 }) {
        const offset = (page - 1) * limit;
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
                    model: Professional,
                    as: 'professional',
                    attributes: ['id', 'name']
                }
            ],
            offset,
            limit,
            order: [['appointmentDate', 'DESC'], ['appointmentTime', 'DESC']]
        });
        return { appointments: rows, total: count, page, limit };
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
                    model: Professional,
                    as: 'professional',
                    attributes: ['id', 'name']
                }
            ]
        });
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
                        model: Professional,
                        as: 'professional',
                        attributes: ['id', 'name']
                    }
                ],
                order: [['appointmentDate', 'DESC'], ['appointmentTime', 'DESC']]
            });
        } catch (error) {
            if (error && error.original && error.original.code === 'ER_NO_SUCH_TABLE') {
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
            order: [['appointmentTime', 'ASC']]
        });
    }
}

module.exports = AppointmentService;
