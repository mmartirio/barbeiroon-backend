const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const tenantMiddleware = require('../middlewares/tenantMiddleware');
const { checkPermission } = require('../middlewares/checkPermission');
const upload = require('../middlewares/upload');

// ===== ROTAS PÚBLICAS (sem autenticação) =====

// Registro completo de nova barbearia (onboarding)
router.post('/register', tenantController.register);

// Buscar barbearia por slug (para portal público)
router.get('/slug/:slug', tenantController.getBySlug);

// Nova rota para buscar config do tenant
router.get('/:id/config', tenantController.getConfig);

// ===== ROTAS PROTEGIDAS (requerem autenticação) =====

// Buscar configurações da barbearia
router.get(
    '/settings',
    tenantMiddleware,
    tenantController.getSettings
);

// Atualizar dados da própria barbearia (requer permissão canManageTenant)
router.put(
    '/settings',
    tenantMiddleware,
    checkPermission('canManageTenant'),
    tenantController.updateTenant
);

// Upload de logo e background da barbearia
router.post(
    '/upload-assets',
    tenantMiddleware,
    checkPermission('canManageTenant'),
    upload.fields([
        { name: 'logo', maxCount: 1 },
        { name: 'background', maxCount: 1 }
    ]),
    tenantController.uploadAssets
);

// Upload de imagem de fundo do tenant (legacy)
router.post(
    '/:id/background',
    tenantMiddleware,
    checkPermission('canManageTenant'),
    upload.single('background'),
    tenantController.uploadBackgroundImage
);

// Atualiza logo e backgroundImage do tenant (base64 ou url) (legacy)
router.put(
    '/:id/images',
    tenantMiddleware,
    checkPermission('canManageTenant'),
    tenantController.updateImages
);

// Listar todas as barbearias (apenas para super admin - pode remover se não for necessário)
router.get('/', tenantController.getAll);

// Criar barbearia (legacy - usar /register ao invés)
router.post('/', tenantController.create);

// Deletar barbearia (apenas super admin)
router.delete('/:id', tenantController.delete);

// Atualizar barbearia (legacy)
router.put('/:id', tenantController.update);

module.exports = router;
