const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PaymentMethod = sequelize.define('PaymentMethod', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    type: {
        type: DataTypes.ENUM('pix', 'boleto'),
        allowNull: false,
    },
    label: { type: DataTypes.STRING(100), allowNull: false },
    config: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Configurações: chave pix, dados bancários para boleto, etc.',
    },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
}, {
    tableName: 'payment_methods',
    timestamps: true,
});

module.exports = PaymentMethod;
