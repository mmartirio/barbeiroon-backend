const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Appointment = sequelize.define('Appointment', {
    customerPhone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        references: {
            model: 'customers',
            key: 'phone',
        },
        field: 'customer_phone',
    },
    serviceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'service',
            key: 'id',
        },
        field: 'service_id',
    },
    professionalId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'professional',
            key: 'id',
        },
        field: 'professional_id',
    },
    promotionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'promotion_id',
    },
    appointmentDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'appointment_date',
    },
    appointmentTime: {
        type: DataTypes.TIME,
        allowNull: false,
        field: 'appointment_time',
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'agendado',
        field: 'status',
    },
    tenantId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tenants',
            key: 'id',
        },
        field: 'tenant_id',
    },
}, {
    tableName: 'appointment',
    timestamps: true,
    freezeTableName: true,
});

module.exports = Appointment;
