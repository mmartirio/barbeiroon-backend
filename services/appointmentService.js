const Appointment = require('../models/Appointment');

class AppointmentService {
    static async getAll({ tenantId, page = 1, limit = 10 }) {
        const offset = (page - 1) * limit;
        const { rows, count } = await Appointment.findAndCountAll({
            where: { tenantId },
            offset,
            limit
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
        return await Appointment.findOne({ where: { id, tenantId } });
    }
}

module.exports = AppointmentService;
