const express = require('express');
const router = express.Router();
const Service = require('../models/Service'); // Caminho para o modelo de serviços

// Rota para obter serviços realizados 
router.get('/servicos-realizados', async (req, res) => {
    try {
        // Agrupa os serviços por tipo e conta o total
        const services = await Service.findAll({
            attributes: [
                'tipoServico', // Campo pelo qual queremos agrupar
                [sequelize.fn('COUNT', sequelize.col('tipoServico')), 'total'] // Conta os serviços de cada tipo
            ],
            group: ['tipoServico'] // Agrupa por tipoServico
        });

        res.json(services);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar dados de serviços.' });
    }
});

module.exports = router; // Certifique-se de exportar o roteador
