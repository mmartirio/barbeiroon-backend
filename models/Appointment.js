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
    date: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'Scheduled',
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
