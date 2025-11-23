const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Ajuste o caminho conforme necessário

const Appointment = sequelize.define('Appointment', {
    userId: {
        type: DataTypes.INTEGER, // Supondo que userId seja um inteiro
        allowNull: false,
        references: {
            model: 'user', // Nome da tabela referenciada no banco de dados (corrigido para minúsculo e singular)
            key: 'id',
        },
    },
    serviceId: {
        type: DataTypes.INTEGER, // Supondo que serviceId seja um inteiro
        allowNull: false,
        references: {
            model: 'service', // Nome da tabela referenciada no banco de dados (corrigido para minúsculo e singular)
            key: 'id',
        },
    },
    professionalId: {
        type: DataTypes.INTEGER, // Supondo que professionalId seja um inteiro
        allowNull: false,
        references: {
            model: 'professional', // Nome da tabela referenciada no banco de dados (corrigido para minúsculo e singular)
            key: 'id',
        },
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'Scheduled',
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
    tableName: 'appointment', // Nome da tabela no banco de dados (corrigido para minúsculo e singular)
    timestamps: true, // Adiciona colunas createdAt e updatedAt
    freezeTableName: true, // Garante que o nome da tabela será exatamente 'appointment'
});

module.exports = Appointment;
