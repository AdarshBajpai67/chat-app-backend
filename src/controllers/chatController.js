const { redisClient } = require("../config/redis");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const mongoose = require("mongoose");

// Retrieve cached data
const getCachedData = async (key) => {
  try {
    const data = await redisClient.lRange(key, 0, -1);
    return data.map((item) => JSON.parse(item));
  } catch (error) {
    console.error(`Error getting cache for key: ${key}`, error);
    return null;
  }
};

// Set cached data with dynamic expiry based on access count
const setCachedData = async (key, messages, expireSeconds = 3600) => {
  try {
    await redisClient.del(key); // Clear existing data
    for (const message of messages) {
      const cachedMessage = {
        _id: message._id.toString(),
        content: message.content,
        sender: message.sender,
        reciever: message.reciever,
        timestamp: message.timestamp
      };
      await redisClient.lPush(key, JSON.stringify(cachedMessage));
    }
    await redisClient.lTrim(key, 0, 9); // Keep only the latest 10 messages
    await redisClient.expire(key, expireSeconds);
    console.log(`Successfully cached latest messages for key: ${key}`);
  } catch (error) {
    console.error(`Error setting cache for key: ${key}`, error);
  }
};

const getCacheKey = (userID1, userID2) =>
  `messages:${[userID1, userID2].sort().join(":")}`;

const addMessageToCache = async (senderId, receiverId, message) => {
  const cacheKey = getCacheKey(senderId, receiverId);
  try {
    const cachedMessage = {
      _id: message._id.toString(),
      content: message.content,
      sender: message.sender,
      reciever: message.reciever,
      timestamp: message.timestamp
    };
    await redisClient.lPush(cacheKey, JSON.stringify(cachedMessage));
    await redisClient.lTrim(cacheKey, 0, 9); // Keep only the latest 10 messages
    await redisClient.expire(cacheKey, 3600); // Reset expiry to 1 hour
  } catch (error) {
    console.error(`Error adding message to cache: ${cacheKey}`, error);
  }
};

const cleanupExpiredKeys = async () => {
  const script = `
    local keys = redis.call('KEYS', 'messages:*')
    local deleted = 0
    for i, key in ipairs(keys) do
      if redis.call('TTL', key) <= 0 then
        redis.call('DEL', key)
        deleted = deleted + 1
      end
    end
    return deleted
  `;

  try {
    const deletedCount = await redisClient.eval(script, 0);
    console.log(`Cleaned up ${deletedCount} expired keys`);
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
};

// Run cleanup every hour
let cleanupInterval;

exports.startCleanupInterval = () => {
  cleanupInterval = setInterval(cleanupExpiredKeys, 3600000);
};

exports.stopCleanupInterval = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  const { receiverId, message } = req.body;
  const { userID: senderId, userType } = req.user;
  // console.log("Full req.user object:", req.user);
  // console.log("senderId:", senderId);
  // console.log("userType:", userType);

  try {
    if (!receiverId || !message) {
      return res
        .status(400)
        .json({ error: "receiverId and message are required" });
    }

    const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1 MB, adjust as needed
    // console.log('Payload size:', JSON.stringify(req.body).length);
    if (JSON.stringify(req.body).length > MAX_PAYLOAD_SIZE) {
      return res.status(413).json({ error: "Payload too large" });
    }

    // let receiver = await getCachedData(`user:${receiverId}:data`);
    // console.log(' before mongodb Receiver ID:', receiverId);
    const receiver = await User.findById(
      new mongoose.Types.ObjectId(receiverId)
    ).select("userName userEmail userType");
    if (!receiver) {
      return res.status(404).json({ error: "Receiver not found" });
    }
    // console.log("Receiver before validating:", receiver);

    if (userType === "USER" && receiver.userType === "USER") {
      // console.log("Invalid permissions:", userType, receiver.userType);
      return res
        .status(403)
        .json({ error: "Only admins and teachers can send messages to user" });
    }

    // console.log("sending message between: ",userType," and ", receiver.userType," which is ", message)
    const newMessage = new Message({
      sender: senderId,
      receiver: receiverId,
      content: message,
      isBroadcast: false,
      timestamp: new Date(),
    });

    const savedMessage = await newMessage.save();
    // console.log("Message sent successfully:", savedMessage);

    // Now we have an _id, so we can safely cache the message
    await addMessageToCache(senderId, receiverId, savedMessage);

    if (req.io) {
      console.log("Emitting message to receiver:", receiverId);
      req.io.emit("message", savedMessage);
    } else {
      console.warn("Socket.io not initialized");
    }

    res.status(201).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending message:", error);
    if (error.name === "MongoError" && error.code === 11000) {
      return res.status(409).json({ error: "Duplicate message detected" });
    }
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

exports.specificUserMessages = async (req, res) => {
  try {
    const { requestedUserID } = req.params;
    const { cursor, limit = 10 } = req.query;
    const senderId = req.user.userID;

    if (!requestedUserID) {
      return res.status(400).json({ error: "User ID is required" });
    }
    if (!User.findById(new mongoose.Types.ObjectId(requestedUserID))) {
      return res.status(404).json({ error: "User not found" });
    }

    // console.log("Requested user ID:", requestedUserID);
    // console.log("Sender ID:", req.user.userID);

    const cacheKey = getCacheKey(req.user.userID, requestedUserID);
    let messages;
    let cachedMessages = await getCachedData(cacheKey);

    if (!cursor && cachedMessages && cachedMessages.length > 0) {
      messages = cachedMessages;
    } else {
      const matchCondition = {
        $or: [
          {
            sender: new mongoose.Types.ObjectId(requestedUserID),
            receiver: new mongoose.Types.ObjectId(req.user.userID),
          },
          {
            sender: new mongoose.Types.ObjectId(req.user.userID),
            receiver: new mongoose.Types.ObjectId(requestedUserID),
          },
        ],
      };

      // const allMessages = await Message.find(matchCondition).sort({ timestamp: -1 });
      // console.log("All matching messages from MongoDB:", allMessages);

      if (cursor) {
        try {
          console.log("Parsing cursor:", cursor);
          matchCondition._id = { $lt: new mongoose.Types.ObjectId(cursor) };
          console.log("Match condition with cursor:", matchCondition);
        } catch (error) {
          console.error("Error parsing cursor ObjectId:", error);
          return res.status(400).json({ error: "Invalid cursor format" });
        }
      }

      messages = await Message.find(matchCondition)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit, 10));

      // messages = await Message.aggregate([
      //   { $match: {...matchCondition} },
      //   { $sort: { timestamp: -1 } },
      //   { $limit: parseInt(limit, 10) },
      //   { $project: { _id: 1, content: 1 } }
      // ]);

      // console.log("Fetched messages from MongoDB:", messages);

      if (!cursor) {
        await setCachedData(cacheKey, messages);
      } // Cache for 1 hour
    }

    const formattedMessages = messages.map((msg) => ({
      _id: msg._id.toString(),
      content: msg.content,
      sender: msg.sender,
      receiver: msg.receiver,
      timestamp: msg.timestamp
    }));

    const nextCursor =
      messages.length > 0 ? messages[messages.length - 1]._id.toString() : null;

    return res.status(200).json({
      message:
        messages.length > 0
          ? "Messages retrieved successfully"
          : "No more messages found for this user",
      data: formattedMessages,
      nextCursor: nextCursor,
    });
  } catch (error) {
    console.error("Error fetching user messages:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while fetching messages" });
  }
};
