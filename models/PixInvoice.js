const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PixInvoice = sequelize.define('PixInvoice', {
    id:           { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenantId:     { type: DataTypes.INTEGER, allowNull: true,  field: 'tenant_id' },
    planType:     { type: DataTypes.STRING(10), allowNull: false, field: 'plan_type', defaultValue: 'monthly', comment: 'monthly|annual' },
    status:       { type: DataTypes.STRING(20), defaultValue: 'PENDING', comment: 'PENDING|PAID|CANCELLED' },
    amountCents:  { type: DataTypes.INTEGER, allowNull: false, field: 'amount_cents' },
    dueDate:      { type: DataTypes.DATEONLY, allowNull: true,  field: 'due_date' },
    description:  { type: DataTypes.STRING(255), allowNull: true },
    customerName: { type: DataTypes.STRING(200), allowNull: true, field: 'customer_name' },
    pixEmv:       { type: DataTypes.TEXT, allowNull: true, field: 'pix_emv' },
    paidAt:       { type: DataTypes.DATE, allowNull: true, field: 'paid_at' },
    notes:        { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'pix_invoices',
    timestamps: true,
});

module.exports = PixInvoice;
