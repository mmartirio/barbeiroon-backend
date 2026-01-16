const Customer = require('../models/Customer');

class CustomerService {
    // Buscar todos os clientes do tenant
    async getAllCustomers(tenantId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const { count, rows } = await Customer.findAndCountAll({
            where: { tenantId },
            limit,
            offset,
            order: [['name', 'ASC']],
        });

        return {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
            customers: rows,
        };
    }

    // Buscar cliente por telefone
    async getCustomerByPhone(phone, tenantId) {
        return await Customer.findOne({
            where: { phone, tenantId },
        });
    }

    // Criar novo cliente
    async createCustomer(data) {
        return await Customer.create(data);
    }

    // Atualizar cliente
    async updateCustomer(phone, tenantId, data) {
        const customer = await this.getCustomerByPhone(phone, tenantId);
        if (!customer) {
            return null;
        }
        await customer.update(data);
        return customer;
    }

    // Deletar cliente
    async deleteCustomer(phone, tenantId) {
        const customer = await this.getCustomerByPhone(phone, tenantId);
        if (!customer) {
            return false;
        }
        await customer.destroy();
        return true;
    }

    // Buscar clientes por nome (pesquisa)
    async searchCustomers(tenantId, searchTerm, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const { Op } = require('sequelize');
        
        const { count, rows } = await Customer.findAndCountAll({
            where: {
                tenantId,
                [Op.or]: [
                    { name: { [Op.like]: `%${searchTerm}%` } },
                    { phone: { [Op.like]: `%${searchTerm}%` } }
                ]
            },
            limit,
            offset,
            order: [['name', 'ASC']],
        });

        return {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
            customers: rows,
        };
    }
}

module.exports = new CustomerService();
