// authRoutes.js
const express = require('express');
const router = express.Router();

// Definindo uma rota de exemplo
router.post('/login', (req, res) => {
    // Lógica de login
    res.send('Login');
});

// Exporte o router
module.exports = router;
