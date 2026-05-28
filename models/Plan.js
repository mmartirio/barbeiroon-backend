const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Plan = sequelize.define('Plan', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    priceMonthly: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'price_monthly',
    },
    priceAnnual: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'price_annual',
    },
    features: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array de strings com recursos inclusos no plano',
    },
    maxUsers: { type: DataTypes.INTEGER, allowNull: true, field: 'max_users' },
    maxAppointments: { type: DataTypes.INTEGER, allowNull: true, field: 'max_appointments' },
    isActive:    { type: DataTypes.BOOLEAN, defaultValue: true,  field: 'is_active' },
    isDefault:   { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_default' },
    isPublic:    { type: DataTypes.BOOLEAN, defaultValue: true,  field: 'is_public', comment: 'false = oculto na landing page e no registrar' },
    trialMonths: { type: DataTypes.INTEGER, allowNull: true,     field: 'trial_months', comment: 'Duração em meses; null = ilimitado / definido por contrato' },
    sortOrder:   { type: DataTypes.INTEGER, defaultValue: 0,     field: 'sort_order',   comment: 'Ordem de exibição dos planos' },
}, {
    tableName: 'plans',
    timestamps: true,
});

module.exports = Plan;
