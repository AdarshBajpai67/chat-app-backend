const express = require('express');
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/send',authMiddleware,chatController.sendMessageToAdmin);

// Route for admin to reply to a user
// router.post('/reply', authMiddleware ,chatController.replyToStudent);

// Route for admin to broadcast a message
router.post('/broadcast', authMiddleware ,chatController.broadcastMessage);

router.get('/allMessages', chatController.getAllMessagesWithRoles);

router.get('/:requestedUserID', authMiddleware ,chatController.specificUserMessages);





module.exports = router;





