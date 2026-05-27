const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PixConfig = sequelize.define('PixConfig', {
    id:        { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    keyType:   { type: DataTypes.STRING(20),  allowNull: false, field: 'key_type',   comment: 'cpf|cnpj|email|phone|random' },
    keyValue:  { type: DataTypes.STRING(150), allowNull: false, field: 'key_value' },
    ownerName: { type: DataTypes.STRING(25),  allowNull: false, field: 'owner_name', comment: 'Nome exibido no PIX (max 25)' },
    city:      { type: DataTypes.STRING(15),  allowNull: false,                      comment: 'Cidade exibida no PIX (max 15)' },
    bankName:  { type: DataTypes.STRING(100), allowNull: true,  field: 'bank_name' },
}, {
    tableName: 'pix_config',
    timestamps: true,
});

module.exports = PixConfig;
