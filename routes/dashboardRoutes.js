const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const tenantMiddleware = require('../middlewares/tenantMiddleware');

router.get('/stats', tenantMiddleware, dashboardController.getStats);

module.exports = router;