const { DataTypes } = require('sequelize');
const db = require('../config/db');

const AppointmentRequest = db.define('AppointmentRequest', {
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'tenant_id'
  },
  customerPhone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'customer_phone'
  },
  serviceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'service_id'
  },
  professionalId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'professional_id'
  },
  appointmentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'appointment_date'
  },
  appointmentTime: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'appointment_time'
  },
  durationMinutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'duration_minutes'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'expired'),
    allowNull: false,
    defaultValue: 'pending'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at'
  }
}, {
  tableName: 'appointment_requests',
  timestamps: true,
  freezeTableName: true
});

module.exports = AppointmentRequest;
