const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const redisClient = require('../config/redis');
const User = require('../models/userModel');
const Group = require('../models/groupModel');
const Message = require('../models/messageModel');


exports.signup = async (req, res) => {
  try {
    const { userEmail, password, userType, firstName, lastName } = req.body;

    // Basic validation
    if (!userEmail || !password || !userType || !firstName || !lastName) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if user exists
    const existingUser = await User.findOne({ userEmail }).select("+password");
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ userEmail, password: hashedPassword, userType, firstName, lastName });
    await user.save();

    res.status(201).json({ message: "User created successfully", user });
  } catch (error) {
    console.error("Error signing up user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { userEmail, password } = req.body;
    // console.log("Login process started");
    console.log("User email:", userEmail);
    console.log("Password:", password);

    // Validate input
    if (!userEmail || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // console.log("Checking cache for user:", userEmail);

    // const cachedToken = await redisClient.get(`user:${userEmail}:token`);
    // if (cachedToken) {
    //   console.log("Cached token found for user:", userEmail);
    //   return res.status(200).json({ token: cachedToken });
    // }

    // Find user and verify password
    const user = await User.findOne({ userEmail }).select("_id userName userType password");
    // const user = await User.findOne({ userEmail }).select("+password");
    // console.log("User found:", user);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      // console.log("Invalid credentialsdsfdsdfsdfsdfs");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    

    const token = jwt.sign({ userID: user._id, userType: user.userType}, process.env.JWT_SECRET, { expiresIn: "48h" });
    // console.log('Token payload:', { userID: user._id, userType: user.userType });
    // console.log('Generated token:', token);
    // console.log('token', token);
    // await redisClient.setEx(`user:${userEmail}:token`, 3600, token);
    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getChatTabUsers = async (req, res) => {
  const { userType, userID } = req.user;
  const page = req.query.page ? parseInt(req.query.page) : 1;
  const limitOnUser = req.query.limitOnUser ? parseInt(req.query.limitOnUser) : 10;
  const limitOnGroup = req.query.limitOnGroup ? parseInt(req.query.limitOnGroup) : 10;

  try {
    let users = [];
    let groups = [];
    let totalUsersCount = 0;
    let totalGroupsCount = 0;

    if (userType === "ADMIN") {
      users = await User.find({ _id: { $ne: userID } }, { _id: 1, userName: 1, userEmail: 1, userType: 1 })
        .skip((page - 1) * limitOnUser)
        .limit(limitOnUser);
      totalUsersCount = await User.countDocuments({ _id: { $ne: userID } });

      groups = await Group.find({}, { _id: 1, groupName: 1 })
        .skip((page - 1) * limitOnGroup)
        .limit(limitOnGroup);
      totalGroupsCount = await Group.countDocuments();
    } else if (userType === "TEACHER") {
      users = await User.find({ _id: { $ne: userID } }, { _id: 1, userName: 1, userEmail: 1, userType: 1, groups: 1 })
        .populate("groups", "_id")
        .skip((page - 1) * limitOnUser)
        .limit(limitOnUser);
      totalUsersCount = await User.countDocuments({ _id: { $ne: userID } });

      const groupIds = users.flatMap(user => user.groups.map(group => group._id));
      groups = await Group.find({ _id: { $in: groupIds } }, { _id: 1, groupName: 1 })
        .skip((page - 1) * limitOnGroup)
        .limit(limitOnGroup);
      totalGroupsCount = await Group.countDocuments({ _id: { $in: groupIds } });
    } else if (userType === "USER") {
      users = await User.find({ userType: { $in: ["ADMIN", "TEACHER"] }, _id: { $ne: userID } }, { _id: 1, userName: 1, userEmail: 1, userType: 1, groups: 1 })
        .populate("groups", "_id")
        .skip((page - 1) * limitOnUser)
        .limit(limitOnUser);
      totalUsersCount = await User.countDocuments({ userType: { $in: ["ADMIN", "TEACHER"] }, _id: { $ne: userID } });

      const groupIds = users.flatMap(user => user.groups.map(group => group._id));
      groups = await Group.find({ _id: { $in: groupIds } }, { _id: 1, groupName: 1 })
        .skip((page - 1) * limitOnGroup)
        .limit(limitOnGroup);
      totalGroupsCount = await Group.countDocuments({ _id: { $in: groupIds } });
    }
    // console.log("Users fetched:", users);

    res.status(200).json({ users, totalUsersCount, groups, totalGroupsCount });
  } catch (error) {
    console.error("Error fetching users for chat tab:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getUserDataOfGroup = async (req, res) => {
  const {groupId} = req.params;
  const { userID } = req.user;
  console.log("Group ID:", groupId);
  
  try {
    const group = await Group.findById(new mongoose.Types.ObjectId(groupId));
    // console.log("Fetched group:", group);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    if (!group.members.includes(userID) && req.user.userType !== "ADMIN") {
      return res.status(403).json({ error: "You are not a member of this group" });
    }
    
    const memberIds = group.members.map(member => new mongoose.Types.ObjectId(member));
    // console.log("Member IDs:", memberIds);
    
    const groupUsers = await User.find({ _id: {$in: memberIds}}, { _id: 1, userName: 1, userEmail: 1, userType: 1 });
    // console.log("Group users fetched:", groupUsers);
    
    // Remove non-existent users from the group
    const existingUserIds = groupUsers.map(user => user._id.toString());
    const nonExistentUserIds = memberIds.filter(id => !existingUserIds.includes(id.toString()));
    
    if (nonExistentUserIds.length > 0) {
      console.log("Removing non-existent users from group:", nonExistentUserIds);
      await Group.updateOne(
        { _id: group._id },
        { $pull: { members: { $in: nonExistentUserIds } } }
      );
    }
    
    res.status(200).json({ groupUsers, removedMembers: nonExistentUserIds });
  } catch (error) {
    console.error("Error fetching group users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getUsersWithMessages = async (req, res) => {
  const { userID, userType } = req.user;
  const page = req.query.page ? parseInt(req.query.page) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit) : 10;

  console.log('user', req.user);

  try {
    // Find users who have exchanged messages with the current user
    // and get the timestamp of their most recent message
    const messagePartners = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: new mongoose.Types.ObjectId(userID) },
            { receiver: new mongoose.Types.ObjectId(userID) }
          ]
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", new mongoose.Types.ObjectId(userID)] },
              "$receiver",
              "$sender"
            ]
          },
          lastMessageTime: { $first: "$timestamp" }
        }
      },
      {
        $sort: { lastMessageTime: -1 }
      }
    ]);

    console.log("Message partners:", messagePartners);

    let userIds = messagePartners.map(partner => partner._id);

    let query = { _id: { $in: userIds, $ne: new mongoose.Types.ObjectId(userID) } };

    // If the user is not an admin, only show admins and teachers
    if (userType !== "ADMIN") {
      query.userType = { $in: ["ADMIN", "TEACHER"] };
    }

    const users = await User.find(query, { _id: 1, userName: 1, email: 1, userType: 1 });

    // Create a map of user IDs to their last message time
    const userLastMessageMap = new Map(messagePartners.map(partner => [partner._id.toString(), partner.lastMessageTime]));

    // Sort users based on their last message time
    users.sort((a, b) => {
      const timeA = userLastMessageMap.get(a._id.toString());
      const timeB = userLastMessageMap.get(b._id.toString());
      return timeB - timeA;
    });

    // Apply pagination after sorting
    const paginatedUsers = users.slice((page - 1) * limit, page * limit);

    const totalUsersCount = users.length;

    res.status(200).json({
      users: paginatedUsers,
      totalUsersCount,
      currentPage: page,
      totalPages: Math.ceil(totalUsersCount / limit)
    });
  } catch (error) {
    console.error("Error fetching users with messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getGroupsForUser = async (req, res) => {
  const { userID, userType } = req.user;
  console.log("Fetching groups for user:", userID);
  const page = req.query.page ? parseInt(req.query.page) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit) : 10;

  try {
    let query = {members: userID };

    if (userType !== "ADMIN") {
      // For non-admin users, only fetch groups they're a member of
      query = { members: userID };
    }

    const groups = await Group.find(query, { _id: 1, groupName: 1, members: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalGroupsCount = await Group.countDocuments(query);

    res.status(200).json({ 
      groups, 
      totalGroupsCount,
      currentPage: page,
      totalPages: Math.ceil(totalGroupsCount / limit)
    });
  } catch (error) {
    console.error("Error fetching groups for user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};