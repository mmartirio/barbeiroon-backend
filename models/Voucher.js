const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Voucher = sequelize.define('Voucher', {
    code: {
        type: DataTypes.STRING(32),
        allowNull: false,
        unique: true,
    },
    customerPhone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'customer_phone',
    },
    tenantId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'tenant_id',
    },
    promotionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'promotion_id',
    },
    used: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'expires_at',
    },
}, {
    tableName: 'vouchers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    freezeTableName: true,
});

module.exports = Voucher;
