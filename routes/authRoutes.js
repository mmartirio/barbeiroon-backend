const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

const resetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: 'Muitas tentativas. Tente novamente em 15 minutos.' },
});

router.post('/login',               loginLimiter,  authController.login);
router.post('/forgot-password',     resetLimiter,  authController.forgotPassword);
router.post('/verify-reset-code',   resetLimiter,  authController.verifyResetCode);
router.post('/reset-password',      resetLimiter,  authController.resetPassword);

module.exports = router;
