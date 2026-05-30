const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class SupportTicket extends Model {}

SupportTicket.init({
    id:        { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenantId:  { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
    userId:    { type: DataTypes.INTEGER, allowNull: true,  field: 'user_id' },
    userName:  { type: DataTypes.STRING(100), allowNull: true, field: 'user_name' },
    userEmail: { type: DataTypes.STRING(150), allowNull: true, field: 'user_email' },
    category:  { type: DataTypes.STRING(50), defaultValue: 'other' },
    status:    { type: DataTypes.ENUM('open','attending','paused','resolved','canceled'), defaultValue: 'open' },
    closedAt:  { type: DataTypes.DATE, allowNull: true, field: 'closed_at' },
}, {
    sequelize,
    modelName: 'SupportTicket',
    tableName: 'support_tickets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = SupportTicket;
