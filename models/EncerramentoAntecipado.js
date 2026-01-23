const { DataTypes } = require('sequelize');
const db = require('../config/db');

const EncerramentoAntecipado = db.define('EncerramentoAntecipado', {
  dia: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  hora: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  motivo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = EncerramentoAntecipado;
