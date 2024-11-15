const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Ajuste o caminho conforme necessário

const Appointment = sequelize.define('Appointment', {
    userId: {
        type: DataTypes.INTEGER, // Supondo que userId seja um inteiro
        allowNull: false,
        references: {
            model: 'Users', // Nome da tabela referenciada no banco de dados
            key: 'id',
        },
    },
    serviceId: {
        type: DataTypes.INTEGER, // Supondo que serviceId seja um inteiro
        allowNull: false,
        references: {
            model: 'Services', // Nome da tabela referenciada no banco de dados
            key: 'id',
        },
    },
    professionalId: {
        type: DataTypes.INTEGER, // Supondo que professionalId seja um inteiro
        allowNull: false,
        references: {
            model: 'Professionals', // Nome da tabela referenciada no banco de dados
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
}, {
    // Opções adicionais, se necessário
    tableName: 'Appointments', // Nome da tabela no banco de dados
    timestamps: true, // Adiciona colunas createdAt e updatedAt
});

module.exports = Appointment;
