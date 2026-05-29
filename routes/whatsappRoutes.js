const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const tenantMiddleware = require('../middlewares/tenantMiddleware');

router.get('/status',         tenantMiddleware, whatsappController.getStatus);
router.get('/qrcode',         tenantMiddleware, whatsappController.getQrCode);
router.delete('/disconnect',  tenantMiddleware, whatsappController.disconnect);
router.post('/reminder/test', tenantMiddleware, whatsappController.testReminder);

module.exports = router;
