const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Ajuste o caminho conforme necessário

const Report = sequelize.define('Report', {
    dataInicio: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    dataFim: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    tipoRelatorio: {
        type: DataTypes.ENUM('diário', 'semanal', 'mensal', 'anual'),
        allowNull: false,
    },
    usuarioId: {
        type: DataTypes.INTEGER, // Presumindo que você tenha um ID de usuário como inteiro
        allowNull: true,
        references: {
            model: 'Users', // Nome da tabela relacionada ao modelo User
            key: 'id', // Chave primária do modelo User
        },
    },
}, {
    // Opções adicionais, se necessário
    tableName: 'Reports', // Nome da tabela no banco de dados
    timestamps: true, // Adiciona colunas createdAt e updatedAt
});

// Definição da relação (um relatório pode ter vários serviços)
Report.associate = (models) => {
    Report.belongsTo(models.User, {
        foreignKey: 'usuarioId',
        as: 'usuario', // Alias para facilitar o uso nas consultas
    });
    Report.belongsToMany(models.Service, {
        through: 'ReportServices', // Nome da tabela intermediária
        foreignKey: 'reportId',
        otherKey: 'serviceId',
        as: 'servicosRealizados', // Alias para facilitar o uso nas consultas
    });
};

module.exports = Report;
