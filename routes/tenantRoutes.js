
const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const upload = require('../middlewares/upload');

// Upload de imagem de fundo do tenant
router.post('/:id/background', upload.single('background'), tenantController.uploadBackgroundImage);
// Atualiza logo e backgroundImage do tenant (base64 ou url)
router.put('/:id/images', tenantController.updateImages);


// Nova rota para buscar config do tenant
router.get('/:id/config', tenantController.getConfig);

router.get('/', tenantController.getAll);
router.post('/', tenantController.create);
router.delete('/:id', tenantController.delete);
router.put('/:id', tenantController.update);

module.exports = router;
