const express = require('express');

const {signup, login, getAllUsers, getAllStudents, getAllAdmins} = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/getAllUsers', getAllUsers);  //so that admin can fetch names of all users

router.get('/getallstudents', authMiddleware,getAllStudents); //so that admin can fetch names of all users
router.get('/getalladmins', getAllAdmins); //so that student can fetch names of all students

module.exports = router;