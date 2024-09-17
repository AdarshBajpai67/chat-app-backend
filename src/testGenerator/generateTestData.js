const mongoose = require('mongoose');
const User = require('../models/userModel');
const Message = require('../models/messageModel');
const connectToMongoDB = require('../config/mongoDB');

async function generateTestData() {
  await connectToMongoDB();

  // Generate Users
  for (let i = 0; i < 100; i++) {
    const user = new User({
      userName: `User${i}`,
      userEmail: `user${i}@example.com`,
      userPassword: 'password',
      userRole: i % 2 === 0 ? 'student' : 'admin',  // Alternating roles
    });
    await user.save();
  }

  // Generate Messages
  const users = await User.find({});
  const studentUsers = users.filter(user => user.userRole === 'student');
  const adminUsers = users.filter(user => user.userRole === 'admin');

  for (let i = 0; i < 1000; i++) {
    const sender = studentUsers[Math.floor(Math.random() * studentUsers.length)];
    const receiver = adminUsers[Math.floor(Math.random() * adminUsers.length)];

    const message = new Message({
      senderId: sender._id,
      receiverId: receiver._id,
      message: `Test message ${i}`,
    });
    await message.save();
  }

  console.log('Test data generated');
  mongoose.disconnect();
}

generateTestData();
