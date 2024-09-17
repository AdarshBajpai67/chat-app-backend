// const redisClient = require("../config/redis");
// const Message = require("../src/models/messageModel");
// const User = require("../src/models/userModel");


const redisClient=require("../config/redis");
const fs = require('fs');
const path = require('path');

const Message=require("../models/messageModel");
const User=require("../models/userModel");


// exports.sendMessageToAdmin = async (req, res) => {
//   console.log("POST /chat/send hit");
//   console.log("Request Body:", req.body);
//   console.log("Request User:", req.user);
//   try {

//     const { receiverId, message } = req.body;
//     console.log("Receiver ID:", receiverId);
//     console.log("Message:", message);
//     console.log("Request User:", req.user); 
    
//     const senderRole = req.user.userRole;
//     const receiver = await User.findById(receiverId);

//     console.log("Receiver:", receiver);
//     console.log("receiver.userRole:", receiver.userRole);
//     if (!receiver) {
//       return res.status(404).json({ error: "Receiver not found" });
//     }

//     if (receiver.userRole !== "admin") {
//       return res.status(403).json({ error: "You can only send messages to admins" });
//     }
//     // if (senderRole === 'student' && receiver.userRole !== 'admin') {
//     //     return res.status(403).json({ error: 'You are not authorized' });
//     // }
//     console.log("Sender ID:", req.user.userID);
//     console.log("req user:", req.user);

//     const newMessage = await Message.create({
//       senderId: req.user.userID,
//       receiverId: receiverId,
//       message,
//     });
//     // await newMessage.save();
//     if (req.io && req.io.sockets) {
//       console.log("Sending message to receiver socket ID:", receiverId);
//       req.io.to(receiverId).emit("message", newMessage);
//     } else {
//       console.error("Socket.io not initialized properly.");
//     }
//     res.status(201).json({ message: "Message sent successfully" });
//   } catch (error) {
//     console.error("Error sending message:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };


const { performance } = require('perf_hooks'); // Using performance for high-resolution timing

exports.sendMessageToAdmin = async (req, res) => {
  try {
    const { receiverId, message } = req.body;

    let receiver;

    // Check Redis cache for the receiver
    const cachedReceiver = await redisClient.get(receiverId);

    if (cachedReceiver) {
      receiver = JSON.parse(cachedReceiver);
      console.log('Receiver fetched from Redis cache');
    } else {
      receiver = await User.findById(receiverId);

      if (receiver) {
        await redisClient.set(receiverId, JSON.stringify(receiver), 'EX', 2*3600); // Cache for 1 hour
        console.log('Receiver data cached in Redis');
      }
    }

    // Validation logic
    if (req.user.userRole === "student" && (!receiver || receiver.userRole !== "admin")) {
      return res.status(403).json({ error: "You can only send messages to admins." });
    } else if (req.user.userRole === "admin" && !receiver) {
      return res.status(404).json({ error: "Receiver not found." });
    }

    const newMessage = new Message({
      senderId: req.user.userID,
      receiverId,
      message,
      isBroadcast: false,
    });
    await newMessage.save();

    if (req.io) {
      req.io.to(receiverId).emit("message", newMessage);
    } else {
      console.error("Socket.io not initialized");
    }

    res.status(201).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending message:", error.message);
    console.error("Stack trace:", error.stack);
    res.status(500).json({ error: "Internal server error" });
  }
};



exports.replyToStudent = async (req, res) => {
  try {
    const { studentID, message } = req.body;
    const requestUserId = req.user.userID;
    console.log('Student ID:', studentID);
    console.log('Message:', message);
    console.log("userName",req.user.userName);

    if (req.user.userRole === "student") {
      return res.status(403).json({ error: "You are not authorized to reply to students" });
    }

    const receiver = await User.findById(studentID);
    if (req.user.userRole !== "admin") {
      return res.status(403).json({ error: "You are not authorized to reply" });
    }
    const newMessage = new Message({
      senderId: requestUserId,
      receiverId: studentID,
      message,
    });
    await newMessage.save();
    req.io.to(studentID).emit("message", newMessage);
    res.status(201).json({ message: "Reply sent successfully" });
  } catch (error) {
    console.error("Error replying to student:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.broadcastMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (req.user.userRole !== "admin") {
      return res
        .status(403)
        .json({ error: "You are not authorized to broadcast message" });
    }
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    const students = await User.find({ userRole: "student" });
    const userIDs = students.map((student) => student._id);
    // const messages = userIDs.map((userID) => {
    //     return {
    //         senderId: req.user.userID,
    //         receiverId: userID,
    //         message,
    //         isBroadcast: true,
    //     };
    // });
    const broadcastMessage = new Message({
      senderId: req.user.userID,
      receiverId: null,
      message,
      isBroadcast: true,
    });
    await broadcastMessage.save();

    redisClient.publish(
      "broadcastChannel",
      JSON.stringify(message, userIDs),
      (error) => {
        if (error) {
          console.error("Error broadcasting message:", error);
        }
      }
    ); // check
    res.status(201).json({ message: "Broadcast message sent successfully" });
  } catch (error) {
    console.error("Error broadcasting message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.specificUserMessages = async (req, res) => {
  try {
    const { requestedUserID } = req.params;
    const currentUserID = req.user.userID;

    // Check Redis cache for users
    const cachedCurrentUser = await redisClient.get(currentUserID);
    const cachedRequestedUser = await redisClient.get(requestedUserID);

    let currentUser = cachedCurrentUser ? JSON.parse(cachedCurrentUser) : null;
    let requestedUser = cachedRequestedUser ? JSON.parse(cachedRequestedUser) : null;

    // Fetch from DB if not cached
    if (!currentUser || !requestedUser) {
      [requestedUser, currentUser] = await Promise.all([
        !requestedUser ? User.findById(requestedUserID) : requestedUser,
        !currentUser ? User.findById(currentUserID) : currentUser,
      ]);

      // Cache fetched users
      if (requestedUser) await redisClient.set(requestedUserID, JSON.stringify(requestedUser), 'EX', 3600); // 1 hour
      if (currentUser) await redisClient.set(currentUserID, JSON.stringify(currentUser), 'EX', 3600); // 1 hour
    }

    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Students are not allowed to see each other's messages
    if (currentUser.userRole === "student" && requestedUser.userRole === "student") {
      return res.status(403).json({ error: "You are not authorized to view messages" });
    }

    const cacheKey = `messages:${currentUserID}:${requestedUserID}`;
    const cachedMessages = await redisClient.get(cacheKey);

    let messages;
    if (cachedMessages) {
      messages = JSON.parse(cachedMessages);
      console.log('Messages fetched from Redis cache');
    } else {
      messages = await Message.find({
        $or: [
          { senderId: currentUserID, receiverId: requestedUserID },
          { senderId: requestedUserID, receiverId: currentUserID },
        ],
      })
        .sort({ timestamp: -1 }) 
        .limit(10)
        .lean();

      await redisClient.set(cacheKey, JSON.stringify(messages), 'EX', 3600); // Cache messages for 1 hour
      console.log('Messages data cached in Redis');
    }

    res.status(200).json({ message: "Messages:", messages });
  } catch (error) {
    console.error("Error getting messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};



exports.getAllMessagesWithRoles = async (req, res) => {
  console.log("Fetching messages and user roles...");
  try {
    // Fetch all messages
    const messages = await Message.find();

    if (!messages || messages.length === 0) {
      return res.status(404).json({ error: 'No messages found' });
    }

    // Collect all unique user IDs from the messages
    const userIds = [...new Set(messages.flatMap(msg => [msg.senderId, msg.receiverId]))];

    // Fetch all users with those IDs
    const users = await User.find({ _id: { $in: userIds.map(id => id.toString()) } });

    // Create a map for quick user lookup
    const userMap = new Map(users.map(user => [user._id.toString(), user]));

    // Initialize log content with a serial number
    let logContent = "";
    let serialNumber = 1;

    // Prepare the file path where the log will be stored
    const logFilePath = path.join(__dirname, 'messages_log.txt');

    // Log roles for messages
    messages.forEach(message => {
      const sender = userMap.get(message.senderId.toString());
      const receiver = userMap.get(message.receiverId.toString());

      if (sender && receiver) {
        logContent += `${serialNumber++}. Message ID: ${message._id}\n`;
        logContent += `   Sender ID: ${message.senderId}, Role: ${sender.userRole}\n`;
        logContent += `   Receiver ID: ${message.receiverId}, Role: ${receiver.userRole}\n\n`;
      }
    });

    // Write the log content to the text file
    fs.writeFileSync(logFilePath, logContent, { flag: 'w' });

    res.status(200).json({ message: "Messages and user roles logged successfully to the text file." });
  } catch (error) {
    console.error("Error fetching messages and user roles:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

