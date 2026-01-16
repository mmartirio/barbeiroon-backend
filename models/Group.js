const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/db');

class Group extends Model {}

Group.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    tenantId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'tenants',
            key: 'id',
        },
    },
    // Permissões de Usuários
    canCreateUser: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_create_user',
    },
    canEditUser: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_edit_user',
    },
    canDeleteUser: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_delete_user',
    },
    canViewUsers: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_view_users',
    },
    // Permissões de Grupos
    canManageGroups: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_manage_groups',
    },
    // Permissões de Clientes
    canViewCustomers: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_view_customers',
    },
    canCreateCustomer: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_create_customer',
    },
    canEditCustomer: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_edit_customer',
    },
    canDeleteCustomer: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_delete_customer',
    },
    // Permissões de Agendamentos
    canViewAppointments: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_view_appointments',
    },
    canCreateAppointment: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_create_appointment',
    },
    canEditAppointment: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_edit_appointment',
    },
    canDeleteAppointment: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_delete_appointment',
    },
    // Permissões de Serviços
    canViewServices: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_view_services',
    },
    canManageServices: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_manage_services',
    },
    // Permissões de Profissionais
    canViewProfessionals: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_view_professionals',
    },
    canManageProfessionals: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_manage_professionals',
    },
    // Permissões de Agenda
    canViewAgenda: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_view_agenda',
    },
    canManageAgenda: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_manage_agenda',
    },
    // Permissões de Relatórios
    canViewReports: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_view_reports',
    },
    // Permissões de Configurações do Tenant
    canManageTenant: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'can_manage_tenant',
    },
}, {
    sequelize,
    modelName: 'Group',
    tableName: 'groups',
    timestamps: true,
});

module.exports = Group;
