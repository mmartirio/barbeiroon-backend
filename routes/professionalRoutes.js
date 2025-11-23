const express = require('express');
const router = express.Router();
const professionalController = require('../controllers/professionalController');

router.get('/', professionalController.getAll);
router.post('/', professionalController.create);
router.delete('/:id', professionalController.delete);
router.put('/:id', professionalController.update);

module.exports = router;
