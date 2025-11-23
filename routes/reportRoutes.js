const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/', reportController.getAll);
router.post('/', reportController.create);
router.delete('/:id', reportController.delete);
router.put('/:id', reportController.update);

module.exports = router;
