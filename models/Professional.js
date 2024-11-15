const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Ajuste o caminho conforme necessário

const Professional = sequelize.define('Professional', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    specialty: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    // Opções adicionais, se necessário
    tableName: 'Professionals', // Nome da tabela no banco de dados
    timestamps: true, // Adiciona colunas createdAt e updatedAt
});

module.exports = Professional;
