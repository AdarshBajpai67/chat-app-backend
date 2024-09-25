const express = require('express');
const groupController = require('../controllers/groupController');
const authMiddleware = require('../middleware/authMiddleware');


const router = express.Router();

router.post("/create", authMiddleware, groupController.createGroup);
router.post("/sendMessage", authMiddleware, groupController.sendGroupMessage);
// router.get('/groups', authMiddleware,groupController.getUserGroups);
router.get("/messages/:groupId", authMiddleware, groupController.getGroupMessages);

module.exports = router;
