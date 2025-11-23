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
        unique: true,
        allowNull: false,
    },
    password: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    role: {
        type: DataTypes.ENUM('cliente', 'barbeiro', 'admin'),
        defaultValue: 'cliente',
    },
    tenantId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tenants',
            key: 'id',
        },
    },
}, {
    sequelize,
    modelName: 'User',
    tableName: 'user', // Nome da tabela no banco de dados (já está correto)
    timestamps: false, // Se quiser timestamps automáticos, mantenha 'true'; se não quiser, defina como 'false'
});

module.exports = User;
