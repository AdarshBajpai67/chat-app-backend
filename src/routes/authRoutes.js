const express = require('express');

const {signup, login, getChatTabUsers,getUserDataOfGroup, getUsersWithMessages,getGroupsForUser } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
// router.get('/getAllUsers', getAllUsers);  //so that admin can fetch names of all users

// router.get('/getallstudents', authMiddleware,getAllStudents); //so that admin can fetch names of all users
// router.get('/getalladmins', getAllAdmins); //so that student can fetch names of all students
// app.get("/api/v1/chat/users/withMessages", [authJwt.verifyToken], chatController.getUsersWithMessages);
// app.get("/api/v1/chat/groups", [authJwt.verifyToken], chatController.getGroupsForUser);

router.get("/getUsersWithMessages",authMiddleware, getUsersWithMessages);
router.get("/getGroupsForUser",authMiddleware, getGroupsForUser);

router.get("/getUsersBasedOnRoles",authMiddleware, getChatTabUsers);
router.get("/getUserDataOfGroup/:groupId",authMiddleware,getUserDataOfGroup)

module.exports = router;