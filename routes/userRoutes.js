const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController'); // Verifique se o caminho está correto

// Rota para obter todos os usuários
router.get('/users', userController.getAllUsers);

// Rota para registrar um novo usuário
router.post('/register', userController.register);

// Rota para editar um usuário
router.put('/:id', userController.userEdit);

// Rota para excluir um usuário
router.delete('/:id', userController.deleteUser); // Adiciona a rota de exclusão

module.exports = router;
