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
    tenantId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tenants',
            key: 'id',
        },
    },
}, {
    // Opções adicionais, se necessário
    tableName: 'service', // Nome da tabela no banco de dados (corrigido para minúsculo e singular)
    timestamps: true, // Adiciona colunas createdAt e updatedAt
    freezeTableName: true, // Garante que o nome da tabela será exatamente 'service'
});

// Exporta o modelo
module.exports = Service;
