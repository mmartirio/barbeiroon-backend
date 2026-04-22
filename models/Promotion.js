const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Promotion = sequelize.define('Promotion', {
    name: {
        type: DataTypes.STRING(120),
        allowNull: false,
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    priceType: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'price_type',
        defaultValue: 'fixo',
    },
    discountType: {
        type: DataTypes.STRING(40),
        allowNull: false,
        field: 'discount_type',
        defaultValue: 'desconto_compra',
    },
    validFrom: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'valid_from',
    },
    validUntil: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'valid_until',
    },
    criteria: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: '[]',
    },
    xPurchases: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'x_purchases',
    },
    serviceX: {
        type: DataTypes.STRING(120),
        allowNull: true,
        field: 'service_x',
    },
    customerCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'customer_count',
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'active',
    },
    tenantId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'tenant_id',
    },
}, {
    tableName: 'promotions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    freezeTableName: true,
});

module.exports = Promotion;
