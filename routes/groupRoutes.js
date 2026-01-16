const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { checkPermission } = require('../middlewares/checkPermission');

// Todas as rotas de grupo requerem permissão canManageGroups

// Listar todos os grupos
router.get('/', checkPermission('canManageGroups'), groupController.getAllGroups);

// Buscar grupo por ID
router.get('/:id', checkPermission('canManageGroups'), groupController.getGroupById);

// Criar novo grupo
router.post('/', checkPermission('canManageGroups'), groupController.createGroup);

// Atualizar grupo
router.put('/:id', checkPermission('canManageGroups'), groupController.updateGroup);

// Deletar grupo
router.delete('/:id', checkPermission('canManageGroups'), groupController.deleteGroup);

module.exports = router;
