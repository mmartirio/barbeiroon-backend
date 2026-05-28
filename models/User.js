const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class User extends Model {}

User.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    password: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    groupId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'groups',
            key: 'id',
        },
        field: 'group_id',
    },
    tenantId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tenants',
            key: 'id',
        },
        field: 'tenant_id',
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
    },
    isBarber: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_barber',
    },
    profileImageId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'profile_image_id',
    },
}, {
    sequelize,
    modelName: 'User',
    tableName: 'user',
    timestamps: true,
    indexes: [
        { unique: true, fields: ['email', 'tenant_id'], name: 'email_tenant_unique' },
    ],
});

module.exports = User;
