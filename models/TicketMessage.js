const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class TicketMessage extends Model {}

TicketMessage.init({
    id:       { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    ticketId: { type: DataTypes.INTEGER, allowNull: false, field: 'ticket_id' },
    sender:   { type: DataTypes.ENUM('user','bot','gestor'), allowNull: false },
    content:  { type: DataTypes.TEXT, allowNull: false },
}, {
    sequelize,
    modelName: 'TicketMessage',
    tableName: 'ticket_messages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
});

module.exports = TicketMessage;
