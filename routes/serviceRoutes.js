const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');

router.get('/', serviceController.getAll);
router.post('/', serviceController.create);
router.delete('/:id', serviceController.delete);
router.put('/:id', serviceController.update);

module.exports = router;
