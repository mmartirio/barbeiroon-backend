const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Ajuste o caminho para o seu arquivo de configuração do Sequelize

const Agenda = sequelize.define('Agenda', {
  data: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  horarioInicio: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  horarioFim: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  servico: {
    type: DataTypes.INTEGER, // Use INTEGER para referência a um ID de serviço
    allowNull: false,
  },
  cliente: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  barbeiro: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('agendado', 'cancelado', 'concluído'),
    defaultValue: 'agendado',
  },
});


module.exports = Agenda;
