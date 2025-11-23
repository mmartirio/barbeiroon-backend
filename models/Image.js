const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Image = sequelize.define('Image', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  data: {
    type: DataTypes.BLOB('long'),
    allowNull: false
  },
  contentType: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'images',
  timestamps: true
});

module.exports = Image;
