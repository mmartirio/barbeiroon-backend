const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Tenant extends Model {}

// ATENÇÃO: Não utilize sequelize.sync({ alter }) em produção!
// Isso pode criar índices duplicados e corromper o schema.
// Mantenha UNIQUE e índices apenas via migrations controladas.

Tenant.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nome fantasia da barbearia'
    },
    companyName: {
        type: DataTypes.STRING(200),
        allowNull: true,
        field: 'company_name',
        comment: 'Razão social'
    },
    cnpj: {
        type: DataTypes.STRING(18),
        allowNull: true,
        comment: 'CNPJ formatado: 00.000.000/0000-00'
    },
    slug: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false,
        comment: 'URL amigável para acesso público'
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Email da barbearia'
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Telefone de contato'
    },
    // Endereço
    address: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Rua, número, complemento'
    },
    neighborhood: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Bairro'
    },
    city: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Cidade'
    },
    state: {
        type: DataTypes.STRING(2),
        allowNull: true,
        comment: 'UF (SP, RJ, MG...)'
    },
    zipCode: {
        type: DataTypes.STRING(10),
        allowNull: true,
        field: 'zip_code',
        comment: 'CEP'
    },
    // Proprietário
    ownerName: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'owner_name',
        comment: 'Nome do proprietário'
    },
    ownerEmail: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'owner_email',
        comment: 'Email do proprietário (será usado para criar usuário admin)'
    },
    ownerPhone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'owner_phone',
        comment: 'Telefone do proprietário'
    },
    // Imagens
    logo: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL ou base64 da logo'
    },
    backgroundImage: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'background_image',
        comment: 'URL ou base64 da imagem de fundo'
    },
    // Status e configurações
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
        comment: 'Se a barbearia está ativa'
    },
    planType: {
        type: DataTypes.ENUM('free', 'basic', 'premium', 'enterprise'),
        defaultValue: 'free',
        field: 'plan_type',
        comment: 'Categoria do plano (fallback quando planId não está definido)'
    },
    planId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'plan_id',
        comment: 'FK para o plano contratado no gestor'
    },
    scheduledDeleteAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'scheduled_delete_at',
        comment: 'Quando não nulo, a conta será excluída automaticamente nesta data'
    },
}, {
    sequelize,
    modelName: 'Tenant',
    tableName: 'tenants',
    timestamps: true,
});

module.exports = Tenant;
