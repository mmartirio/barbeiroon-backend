const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Ajuste o caminho conforme necessário

const Service = sequelize.define('Service', {
    tipoServico: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    data: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW, // Define a data atual como padrão
    },
    cliente: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    valor: {
        type: DataTypes.FLOAT, // Utilizando FLOAT para valores monetários
        allowNull: false,
    },
}, {
    // Opções adicionais, se necessário
    tableName: 'Services', // Nome da tabela no banco de dados
    timestamps: true, // Adiciona colunas createdAt e updatedAt
});

// Exporta o modelo
module.exports = Service;
