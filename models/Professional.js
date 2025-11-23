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
    tableName: 'professional', // Nome da tabela no banco de dados (corrigido para minúsculo e singular)
    timestamps: true, // Adiciona colunas createdAt e updatedAt
    freezeTableName: true, // Garante que o nome da tabela será exatamente 'professional'
});

module.exports = Professional;
