const User = require('./User');
const Group = require('./Group');
const Customer = require('./Customer');
const Tenant = require('./Tenant');
const Appointment = require('./Appointment');
const Service = require('./Service');
const Professional = require('./Professional');

// Relacionamentos User e Group
User.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });
Group.hasMany(User, { foreignKey: 'groupId', as: 'users' });

// Relacionamentos com Tenant
User.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Tenant.hasMany(User, { foreignKey: 'tenantId', as: 'users' });

Group.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Tenant.hasMany(Group, { foreignKey: 'tenantId', as: 'groups' });

Customer.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Tenant.hasMany(Customer, { foreignKey: 'tenantId', as: 'customers' });

// Relacionamentos de Appointment
Appointment.belongsTo(Customer, { foreignKey: 'customerPhone', targetKey: 'phone', as: 'customer' });
Customer.hasMany(Appointment, { foreignKey: 'customerPhone', sourceKey: 'phone', as: 'appointments' });

Appointment.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });
Service.hasMany(Appointment, { foreignKey: 'serviceId', as: 'appointments' });

Appointment.belongsTo(Professional, { foreignKey: 'professionalId', as: 'professional' });
Professional.hasMany(Appointment, { foreignKey: 'professionalId', as: 'appointments' });

Appointment.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
Tenant.hasMany(Appointment, { foreignKey: 'tenantId', as: 'appointments' });

module.exports = {
    User,
    Group,
    Customer,
    Tenant,
    Appointment,
    Service,
    Professional
};
