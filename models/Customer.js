const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Customer extends Model {}

Customer.init({
    phone: {
        type: DataTypes.STRING(20),
        primaryKey: true,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    birthDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'birth_date',
    },
    tenantId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: {
            model: 'tenants',
            key: 'id',
        },
        field: 'tenant_id',
    },
}, {
    sequelize,
    modelName: 'Customer',
    tableName: 'customers',
    timestamps: true,
});

module.exports = Customer;
