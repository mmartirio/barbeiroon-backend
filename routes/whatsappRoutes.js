const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

router.get('/status', whatsappController.getStatus);
router.get('/qrcode', whatsappController.getQrCode);
router.delete('/disconnect', whatsappController.disconnect);
router.post('/reminder/test', whatsappController.testReminder);

module.exports = router;
