const { DataTypes } = require('sequelize');
const db = require('../config/db');

const AgendaSettings = db.define('AgendaSettings', {
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'tenant_id'
  },
  professionalId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'professional_id'
  },
  inicioExpediente: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'inicio_expediente'
  },
  fimExpediente: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'fim_expediente'
  },
  inicioAlmoco: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'inicio_almoco'
  },
  fimAlmoco: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'fim_almoco'
  },
  diasCalendario: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'dias_calendario'
  },
  diasSelecionados: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'dias_selecionados'
  }
}, {
  tableName: 'agenda_settings',
  timestamps: true,
  freezeTableName: true
});

module.exports = AgendaSettings;
