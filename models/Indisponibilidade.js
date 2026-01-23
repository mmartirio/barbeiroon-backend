const { DataTypes } = require('sequelize');
const db = require('../config/db');

const Indisponibilidade = db.define('Indisponibilidade', {
  dia: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  inicio: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  fim: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  motivo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Indisponibilidade;
