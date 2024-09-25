const {redisClient} = require("../config/redis");
const User = require("../models/userModel");
const Message = require("../models/messageModel");


const getCachedUsers = async (userIds) => {
  let cachedUsers = [];
  let usersToFetchFromDb = [];

  // Check Redis cache for each user
  for (let userId of userIds) {
    const cachedUser = await redisClient.get(`user:${userId}:data`);
    if (cachedUser) {
      cachedUsers.push(JSON.parse(cachedUser));
    } else {
      usersToFetchFromDb.push(userId);
    }
  }

  // If there are users not found in cache, fetch from MongoDB
  if (usersToFetchFromDb.length > 0) {
    const dbUsers = await User.find({ _id: { $in: usersToFetchFromDb } }).select('_id');
    
    // Cache the MongoDB results
    for (let user of dbUsers) {
      await redisClient.setEx(`user:${user._id}:data`, 3600, JSON.stringify(user));
      cachedUsers.push(user);
    }
  }

  return cachedUsers;
};


exports.broadcastMessage = async (req, res) => {
  // console.log('broadcasting message');
  const { message, recipientIds } = req.body;
  // console.log('message', message);
  // console.log('recipientIds', recipientIds);

  try {
    // console.log('user', req.user);
    // Ensure only admins can broadcast messages
    if (req.user.userType !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can broadcast" });
    }
    

    // Validate message and recipient IDs
    if (!message || !recipientIds || !recipientIds.length) {
      return res.status(400).json({ error: "Message and recipients are required" });
    }

    // console.log('lookinh')

    // Fetch only the `_id` field for the recipients
    const recipients  = await getCachedUsers(recipientIds);
    // console.log('recipients', recipients);


    // If no valid recipients found
    if (!recipients.length) {
      return res.status(404).json({ error: "No valid recipients found" });
    }

    // Check recipient IDs (optional logging)
    // recipientIds.forEach((recipientId) => {
    //   console.log('Recipient ID:', recipientId);
    // });


    // console.log('user', req.user);
    // console.log('sender', req.user.userID);

    // Prepare the messages to be inserted
    const broadcastMessages = recipients.map((recipient) => ({
      sender: req.user.userID,
      receiver: recipient._id,
      content: message,
      isBroadcast: true,
    }));

    // Insert the broadcast messages into the Message collection
    await Message.insertMany(broadcastMessages);

    // Notify users via Socket.io
    notifyUsers(req.io, recipientIds, message);

    // Respond with success message
    res.status(200).json({ success: "Message broadcasted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error broadcasting message" });
  }
};

// Notify users via Socket.io
function notifyUsers(io, recipientIds, message) {
  if (io) {
    recipientIds.forEach(id => {
      io.to(id).emit("message", { content: message, isBroadcast: true });
    });
  } else {
    console.warn("Socket.io not initialized");
  }
}
