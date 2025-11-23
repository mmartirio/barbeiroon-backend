const express = require('express');
const router = express.Router();
const Image = require('../models/Image'); // Modelo de imagem (ajustar conforme seu ORM)

// Rota para servir imagem binária do banco
router.get('/image/:imageId', async (req, res) => {
  try {
    const image = await Image.findByPk(req.params.imageId); // Sequelize: findByPk
    if (!image) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }
    res.set('Content-Type', image.contentType || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(image.data); // image.data deve ser Buffer
  } catch (error) {
    console.error('Erro ao buscar imagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
