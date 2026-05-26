
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { checkPermission } = require('../middlewares/checkPermission');

// Rota pública para listar usuários do tenant (para o portal do cliente)
router.get('/public/users/:tenantId', userController.getAllUsersPublic);

// Rota pública para listar barbeiros do tenant (para o portal do cliente)
router.get('/barbers/:tenantId', userController.getAllBarbersPublic);

// Rota autenticada: listar barbeiros do tenant (isBarber=true) — sem permissão especial
router.get('/barbers', userController.getBarbers);

// Rota para obter todos os usuários
router.get('/users', checkPermission('canViewUsers'), userController.getAllUsers);

// Rota para obter um usuário por id
router.get('/:id', checkPermission('canViewUsers'), userController.getUserById);

// Rota para registrar um novo usuário (POST / e POST /register são equivalentes)
router.post('/', checkPermission('canCreateUser'), userController.register);
router.post('/register', userController.register);

// Rota para editar um usuário
router.put('/:id', checkPermission('canEditUser'), userController.userEdit);

// Rota para alterar senha de um usuário
router.put('/:id/password', checkPermission('canEditUser'), userController.changePassword);

// Rota para ativar/desativar usuário
router.patch('/:id/toggle-status', checkPermission('canEditUser'), userController.toggleStatus);

// Rota para excluir um usuário
router.delete('/:id', checkPermission('canDeleteUser'), userController.deleteUser);

module.exports = router;
