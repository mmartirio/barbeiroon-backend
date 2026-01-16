const CustomerService = require('../services/customerService');

// Listar todos os clientes
exports.getAllCustomers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const tenantId = req.tenant.id;

        let result;
        if (search) {
            result = await CustomerService.searchCustomers(tenantId, search, page, limit);
        } else {
            result = await CustomerService.getAllCustomers(tenantId, page, limit);
        }

        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao listar clientes:', error);
        res.status(500).json({ message: 'Não foi possível carregar a lista de clientes. Tente novamente' });
    }
};

// Buscar cliente por telefone
exports.getCustomerByPhone = async (req, res) => {
    try {
        const { phone } = req.params;
        const tenantId = req.tenant.id;

        const customer = await CustomerService.getCustomerByPhone(phone, tenantId);
        if (!customer) {
            return res.status(404).json({ message: 'Cliente não encontrado com este telefone' });
        }

        res.status(200).json(customer);
    } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        res.status(500).json({ message: 'Não foi possível buscar o cliente. Verifique o telefone informado' });
    }
};

// Criar novo cliente (pode ser usado pelo portal do cliente ou pelo painel)
exports.createCustomer = async (req, res) => {
    try {
        const { phone, name, birthDate } = req.body;
        
        // Se vier do tenant middleware, usa o tenantId do token
        // Se vier do portal público, o tenantId deve vir no body
        const tenantId = req.tenant?.id || req.body.tenantId;

        if (!tenantId) {
            return res.status(400).json({ message: 'TenantId é obrigatório' });
        }

        // Verifica se já existe cliente com este telefone
        const existingCustomer = await CustomerService.getCustomerByPhone(phone, tenantId);
        if (existingCustomer) {
            return res.status(400).json({ 
                message: 'Cliente já cadastrado com este telefone',
                customer: existingCustomer 
            });
        }

        const newCustomer = await CustomerService.createCustomer({
            phone,
            name,
            birthDate,
            tenantId
        });

        res.status(201).json({ 
            message: 'Cliente cadastrado com sucesso', 
            customer: newCustomer 
        });
    } catch (error) {
        console.error('Erro ao criar cliente:', error);
        res.status(500).json({ message: 'Erro ao criar cliente' });
    }
};

// Atualizar cliente
exports.updateCustomer = async (req, res) => {
    try {
        const { phone } = req.params;
        const tenantId = req.tenant.id;

        const updatedCustomer = await CustomerService.updateCustomer(phone, tenantId, req.body);
        if (!updatedCustomer) {
            return res.status(404).json({ message: 'Cliente não encontrado com este telefone' });
        }

        res.status(200).json({
            message: 'Dados do cliente atualizados com sucesso!',
            customer: updatedCustomer
        });
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        res.status(500).json({ message: 'Não foi possível atualizar os dados do cliente' });
    }
};

// Deletar cliente
exports.deleteCustomer = async (req, res) => {
    try {
        const { phone } = req.params;
        const tenantId = req.tenant.id;

        const deleted = await CustomerService.deleteCustomer(phone, tenantId);
        if (!deleted) {
            return res.status(404).json({ message: 'Cliente não encontrado' });
        }

        res.status(200).json({ message: 'Cliente removido com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        res.status(500).json({ message: 'Não foi possível remover o cliente. Verifique se ele não possui agendamentos' });
    }
};

// Endpoint específico para verificar/criar cliente pelo portal (sem autenticação de usuário)
exports.getOrCreateCustomer = async (req, res) => {
    try {
        const { phone, name, birthDate, tenantId } = req.body;

        if (!phone || !name || !tenantId) {
            return res.status(400).json({ message: 'Telefone, nome e tenantId são obrigatórios' });
        }

        // Busca cliente existente
        let customer = await CustomerService.getCustomerByPhone(phone, tenantId);

        // Se não existir, cria novo
        if (!customer) {
            customer = await CustomerService.createCustomer({
                phone,
                name,
                birthDate,
                tenantId
            });
        }

        res.status(200).json({ 
            message: customer.createdAt ? 'Cliente já cadastrado' : 'Cliente criado com sucesso',
            customer 
        });
    } catch (error) {
        console.error('Erro ao buscar/criar cliente:', error);
        res.status(500).json({ message: 'Não foi possível processar seus dados. Por favor, tente novamente' });
    }
};
