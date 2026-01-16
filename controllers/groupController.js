const GroupService = require('../services/groupService');

// Listar todos os grupos
exports.getAllGroups = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const tenantId = req.tenant.id;

        const result = await GroupService.getAllGroups(tenantId, page, limit);
        res.status(200).json(result);
    } catch (error) {
        console.error('Erro ao listar grupos:', error);
        res.status(500).json({ message: 'Não foi possível carregar a lista de grupos. Tente novamente' });
    }
};

// Buscar grupo por ID
exports.getGroupById = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;

        const group = await GroupService.getGroupById(id, tenantId);
        if (!group) {
            return res.status(404).json({ message: 'Grupo não encontrado. Ele pode ter sido excluído' });
        }

        res.status(200).json(group);
    } catch (error) {
        console.error('Erro ao buscar grupo:', error);
        res.status(500).json({ message: 'Não foi possível carregar as informações do grupo' });
    }
};

// Criar novo grupo
exports.createGroup = async (req, res) => {
    try {
        const tenantId = req.tenant.id;
        const groupData = { ...req.body, tenantId };

        // Verifica se já existe grupo com o mesmo nome
        const existingGroup = await GroupService.findByName(groupData.name, tenantId);
        if (existingGroup) {
            return res.status(400).json({ message: 'Já existe um grupo com este nome. Por favor, escolha outro nome' });
        }

        const newGroup = await GroupService.createGroup(groupData);
        res.status(201).json({ 
            message: 'Grupo criado com sucesso!', 
            group: newGroup 
        });
    } catch (error) {
        console.error('Erro ao criar grupo:', error);
        res.status(500).json({ message: 'Não foi possível criar o grupo. Verifique os dados e tente novamente' });
    }
};

// Atualizar grupo
exports.updateGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;

        const updatedGroup = await GroupService.updateGroup(id, tenantId, req.body);
        if (!updatedGroup) {
            return res.status(404).json({ message: 'Grupo não encontrado para atualização' });
        }

        res.status(200).json({ 
            message: 'Grupo atualizado com sucesso!', 
            group: updatedGroup 
        });
    } catch (error) {
        console.error('Erro ao atualizar grupo:', error);
        res.status(500).json({ message: 'Não foi possível atualizar o grupo. Tente novamente' });
    }
};

// Deletar grupo
exports.deleteGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;

        const deleted = await GroupService.deleteGroup(id, tenantId);
        if (!deleted) {
            return res.status(404).json({ message: 'Grupo não encontrado' });
        }

        res.status(200).json({ message: 'Grupo excluído com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir grupo:', error);
        res.status(500).json({ message: 'Não foi possível excluir o grupo. Verifique se não existem usuários vinculados a ele' });
    }
};
