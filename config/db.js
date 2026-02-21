
const { Sequelize } = require('sequelize');
const path = require('path');
const dotenv = require('dotenv');

// Carrega .env do diretório atual ou raiz do projeto
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Permite override por variável de ambiente
const DB_NAME = process.env.DB_NAME || 'meu_barbeiro';
const DB_USER = process.env.DB_USER || 'barbeiro_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'barbeiro_pass';
let DB_HOST = process.env.DB_HOST;

// ...existing code...

const DB_PORT = process.env.DB_PORT || 3306;
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
});

module.exports = sequelize;
