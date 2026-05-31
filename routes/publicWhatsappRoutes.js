const express = require('express');
const router = express.Router();
const { getPublicStatus } = require('../controllers/whatsappController');

router.get('/status', getPublicStatus);

module.exports = router;
