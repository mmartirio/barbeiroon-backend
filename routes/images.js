const express = require('express');
const router = express.Router();
const Image = require('../models/Image');

function detectMime(buf) {
  if (!buf || buf.length < 4) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0xFF && buf[1] === 0xD8) return 'image/jpeg';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

router.get('/image/:imageId', async (req, res) => {
  try {
    const image = await Image.findByPk(req.params.imageId);
    if (!image) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }
    const buf = Buffer.isBuffer(image.data) ? image.data : Buffer.from(image.data);
    const contentType = detectMime(buf) || image.contentType || 'image/png';
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buf);
  } catch (error) {
    console.error('Erro ao buscar imagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
