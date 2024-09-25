const express = require('express');
const router = express.Router();
const { broadcastMessage } = require('../controllers/broadcastController');
const authMiddleware = require('../middleware/authMiddleware');



router.post('/', authMiddleware,broadcastMessage);

module.exports = router;
