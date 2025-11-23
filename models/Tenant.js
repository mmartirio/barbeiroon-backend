const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Tenant extends Model {}

Tenant.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    slug: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    logo: {
        type: DataTypes.TEXT, // base64 ou url
        allowNull: true,
    },
    backgroundImage: {
        type: DataTypes.TEXT, // base64 ou url
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'Tenant',
    tableName: 'tenants',
    timestamps: true,
});

module.exports = Tenant;
