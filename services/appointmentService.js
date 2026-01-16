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
            order: [['date', 'DESC']]
        });
        return { appointments: rows, total: count, page, limit };
    }

    static async create(data, tenantId) {
        return await Appointment.create({ ...data, tenantId });
    }

    static async delete(id, tenantId) {
        return await Appointment.destroy({ where: { id, tenantId } });
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
            order: [['date', 'DESC']]
        });
    }
}

module.exports = AppointmentService;
