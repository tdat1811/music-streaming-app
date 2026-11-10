const express = require('express');
const router = express.Router();
const chartController = require('../controllers/chartController');

router.get('/', chartController.getAllCharts);
router.get('/:id', chartController.getChartById);

module.exports = router;
