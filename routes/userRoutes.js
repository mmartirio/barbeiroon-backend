const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { checkPermission } = require('../middlewares/checkPermission');

// Rota para obter todos os usuários
router.get('/users', checkPermission('canViewUsers'), userController.getAllUsers);

// Rota para registrar um novo usuário
router.post('/register', checkPermission('canCreateUser'), userController.register);

// Rota para editar um usuário
router.put('/:id', checkPermission('canEditUser'), userController.userEdit);

// Rota para alterar senha de um usuário
router.put('/:id/password', checkPermission('canEditUser'), userController.changePassword);

// Rota para ativar/desativar usuário
router.patch('/:id/toggle-status', checkPermission('canEditUser'), userController.toggleStatus);

// Rota para excluir um usuário
router.delete('/:id', checkPermission('canDeleteUser'), userController.deleteUser);

module.exports = router;
