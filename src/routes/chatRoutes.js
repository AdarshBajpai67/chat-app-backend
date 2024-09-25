const express = require("express");
const chatController = require("../controllers/chatController");
const authMiddleware = require("../middleware/authMiddleware");


const router = express.Router();

router.post("/send", authMiddleware, chatController.sendMessage);

// Route for admin to reply to a user
// router.post('/reply', authMiddleware ,chatController.replyToStudent);

// router.get("/allMessages", chatController.getAllMessagesWithRoles);

router.get("/:requestedUserID",authMiddleware,chatController.specificUserMessages
);

module.exports = router;

