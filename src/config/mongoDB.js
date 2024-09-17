require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;
let connectionAttempts = 0;
const maxAttempts = 5;

const connectToMongoDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 1000000,
      maxPoolSize: 130,
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    connectionAttempts++;
    if (connectionAttempts >= maxAttempts) {
      console.error(`Failed to connect to MongoDB after ${maxAttempts} attempts`, error);
      process.exit(1);  // Exit after max retries
    } else {
      console.error("Error connecting to MongoDB. Retrying in 5 seconds...", error);
      setTimeout(connectToMongoDB, 5000);  // Retry after 5 seconds
    }
  }
};

module.exports = connectToMongoDB;
