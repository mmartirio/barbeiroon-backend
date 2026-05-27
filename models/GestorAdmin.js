const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const GestorAdmin = sequelize.define('GestorAdmin', {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name:        { type: DataTypes.STRING(100), allowNull: false },
    email:       { type: DataTypes.STRING(150), allowNull: false, unique: true },
    password:    { type: DataTypes.STRING(255), allowNull: false },
    isActive:    { type: DataTypes.BOOLEAN, defaultValue: true },
    isBootstrap: { type: DataTypes.BOOLEAN, defaultValue: false },
    mustSetup:   { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'gestor_admins', timestamps: true });

module.exports = GestorAdmin;
