const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const fs = require('fs');
const path = require('path');

exports.signup = async (req, res) => {
  try {
    const { userName, userEmail, userPassword, userRole } = req.body;

    if (!userName || !userEmail || !userPassword || !userRole) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const existingUser = await User.findOne({ userEmail });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const user = new User({ userName, userEmail, userPassword, userRole });
    await user.save();
    res.status(201).json({ message: "User created successfully", user });
  } catch (error) {
    console.error("Error signing up user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { userEmail, userPassword } = req.body;
    // console.log("userEmail ",userEmail);
    // console.log("userPassword ",userPassword);
    if (!userEmail || !userPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const user = await User.findOne({ userEmail }).select('+userPassword');

    if (!user || !(await bcrypt.compare(userPassword, user.userPassword))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign(
      {
        userID: user._id,
        userName: user.userName,
        userRole: user.userRole,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    // console.log("Token:", token);
    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    // Fetch all users
    const users = await User.find({});

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'No users found' });
    }

    // Initialize log content with a serial number
    let logContent = "";
    let serialNumber = 1;

    // Prepare the file path where the log will be stored
    const logFilePath = path.join(__dirname, 'users_log.txt');

    // Append each user to the log content
    users.forEach(user => {
      logContent += `${serialNumber++}. User ID: ${user._id}\n`;
      logContent += `   User Name: ${user.userName}\n`;
      logContent += `   User Email: ${user.userEmail}\n`;
      logContent += `   User Role: ${user.userRole}\n\n`;
    });

    // Write the log content to the text file
    fs.writeFileSync(logFilePath, logContent, { flag: 'w' });

    res.status(200).json({ message: "All users logged successfully to the text file." });
  } catch (error) {
    console.error("Error getting all users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    console.log("User:", req.user);
    if (req.user.userRole !== "admin") {
      return res
        .status(403)
        .json({ error: "You are not authorized to view students" });
    }
    const students = await User.find({ userRole: "student" });
    // console.log('All students:',students);
    res.status(200).json({ message: "All students: ", students });
  } catch (error) {
    console.error("Error getting all students:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ userRole: "admin" });
    console.log("All admins:", admins);
    res.status(200).json({ message: "All admins: ", admins });
  } catch (error) {
    console.error("Error getting all admins:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
