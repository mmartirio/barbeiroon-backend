const express = require('express');
const { checkPermission } = require('../middlewares/checkPermission');
const promotionController = require('../controllers/promotionController');

const router = express.Router();

router.get('/', checkPermission('canViewServices'), promotionController.getAll);
router.post('/', checkPermission('canManageServices'), promotionController.create);
router.put('/:id', checkPermission('canManageServices'), promotionController.update);
router.delete('/:id', checkPermission('canManageServices'), promotionController.delete);

module.exports = router;
