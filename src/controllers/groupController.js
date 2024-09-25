const {redisClient} = require("../config/redis");

const Group = require("../models/groupModel");
const Message = require("../models/messageModel");
const mongoose = require("mongoose");


// Function to cache group messages
const cacheGroupMessages = async () => {
  try {
    const groups = await Group.find({}, { _id: 1 });
    for (const group of groups) {
      const messages = await Message.find({ groupId: group._id })
        .sort({ createdAt: -1 })
        .limit(10);
      await redisClient.set(`group:${group._id}:messages`, JSON.stringify(messages), "EX", 3600); // Cache for 60 minutes
    }
    console.log("Group messages cached successfully.");
  } catch (error) {
    console.error("Error caching group messages:", error);
  }
};


// Start the caching process every 30 minutes
// setInterval(cacheGroupMessages, 1800000); // 30 minutes
let cacheInterval;

exports.startCaching = () => {
  if (!cacheInterval) {
    cacheInterval = setInterval(cacheGroupMessages, 1800000); // 30 minutes
  }
};

// Function to stop the caching process
exports.stopCaching = () => {
  if (cacheInterval) {
    clearInterval(cacheInterval);
    cacheInterval = null;
  }
};

exports.createGroup = async (req, res) => {
    try {
      if (req.user.userType !== "ADMIN") {
        return res.status(403).json({ error: "Only admins can create groups" });
      }
  
      const { groupName, memberIds } = req.body;
      console.log("Group name:", groupName);
      console.log("Member IDs:", memberIds);
      console.log("Admin :", req.user); 
      if (!groupName || !memberIds || memberIds.length === 0) {
        return res.status(400).json({ error: "Group name and members are required" });
      }

      const existingGroup = await Group.findOne({ groupName });
      if (existingGroup) {
        return res.status(400).json({ error: "Group already exists" });
      }
      
      console.log("Creating group...");
      const newGroup = new Group({
        groupName,
        members: [...memberIds, req.user.userID], // Admin automatically added
        admin: req.user.userID,
      });
  
      await newGroup.save();
      console.log("Group created successfully", newGroup);
      // Cache group details
      redisClient.setEx(`group:${newGroup._id}:data`, 3600, JSON.stringify(newGroup));

      res.status(201).json({ message: "Group created successfully", group: newGroup });
    } catch (error) {
      console.error("Error creating group:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };


// Send message to group
exports.sendGroupMessage = async (req, res) => {
  try {
    const { message, groupId } = req.body;
    if (!message || !groupId) {
      return res.status(400).json({ error: "Message and group ID are required" });
    }

    // if(req.user.userType === "USER") {
    //   return res.status(403).json({ error: "Only admins and teachers can send group messages" });
    // }

    // let group = await redisClient.get(`group:${groupId}:data`);
    // if (!group) {
    //   group = await Group.findById(new ObjectID(groupId));
    //   if (!group) {
    //     return res.status(404).json({ error: "Group not found" });
    //   }
    //   redisClient.setEx(`group:${groupId}:data`, 3600, JSON.stringify(group));
    // } else {
    //   group = JSON.parse(group); // Parse cached group data
    // }

    const group=await Group.findById(((groupId)));
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    if (!group.members.includes(req.user.userID)) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    console.log('Sender:', req.user);

    const newMessage = new Message({
      sender: req.user.userID,
      groupId,
      content: message,
      isBroadcast: false,
      createdAt: new Date(),
    });

    await newMessage.save();
    cacheGroupMessages(); // Update group messages cache

    group.members.forEach(memberId => {
      req.io.to(memberId).emit("groupMessage", { message, sender: req.user.userName });
    });

    res.status(200).json({ message: "Group message sent successfully" });
  } catch (error) {
    console.error("Error sending group message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get messages for a group
exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;

    const page = parseInt(req.query.page) || 1;  // Set default page to 1 if not provided
    const limit = parseInt(req.query.limit) || 10; // Set default limit to 10 if not provided

    const group=await Group.findById(((groupId)));
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    if (!group.members.includes(req.user.userID)) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    const cachedMessages = await redisClient.get(`group:${groupId}:messages`);

    if (cachedMessages) {
      return res.status(200).json(JSON.parse(cachedMessages));
    }

    const messages = await Message.find({ groupId })
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 })
    .limit(10);

    await redisClient.set(`group:${groupId}:messages`, JSON.stringify(messages), "EX", 3600);

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error retrieving group messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

