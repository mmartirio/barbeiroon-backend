'use strict';

const { Sequelize } = require('sequelize');

// As variáveis de ambiente já são injetadas pelo Docker Compose.
// O .env local é carregado apenas em desenvolvimento fora do Docker.
if (process.env.NODE_ENV !== 'production') {
    const path    = require('path');
    const dotenv  = require('dotenv');
    const envPath = path.resolve(__dirname, '../.env');
    dotenv.config({ path: envPath });
}

const DB_NAME     = process.env.DB_NAME     || 'barbeiro_on';
const DB_USER     = process.env.DB_USER     || 'barbeiro_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'barbeiro_pass';
const DB_HOST     = process.env.DB_HOST     || 'mysql';   // 'mysql' = nome do serviço no Docker Compose
const DB_PORT     = parseInt(process.env.DB_PORT || '3306', 10);

console.log(`🔌 [db.js] Conectando em ${DB_HOST}:${DB_PORT} → banco: ${DB_NAME} | usuário: ${DB_USER}`);

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host:    DB_HOST,
    port:    DB_PORT,
    dialect: 'mysql',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    pool: {
        max:     10,
        min:     0,
        acquire: 30000, // ms para tentar adquirir conexão antes de lançar erro
        idle:    10000, // ms antes de liberar conexão ociosa
    },
    dialectOptions: {
        connectTimeout: 10000,
    },
    define: {
        underscored:   false,
        freezeTableName: false,
        charset:       'utf8mb4',
        collate:       'utf8mb4_unicode_ci',
    },
});

module.exports = sequelize;