
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
let connectionAttempts = 0;
const maxAttempts = 5;

const connectToMongoDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
      maxPoolSize: 100, // Increased from 10 (default) to 100
      serverSelectionTimeoutMS: 30000, // Increased from 30000 to 60000
      socketTimeoutMS: 45000, // Increased from 30000 to 45000
    });
    // console.log("Connected to MongoDB");

    // Implement simple in-memory cache
    mongoose.Query.prototype.cache = function(options = { ttl: 60 }) {
      this.useCache = true;
      this.cacheTTL = options.ttl;
      return this;
    };

    const exec = mongoose.Query.prototype.exec;

    mongoose.Query.prototype.exec = async function() {
      if (!this.useCache) {
        return exec.apply(this, arguments);
      }

      const key = JSON.stringify({
        ...this.getQuery(),
        collection: this.mongooseCollection.name
      });

      const cachedResult = getFromCache(key);
      if (cachedResult) {
        return cachedResult;
      }

      const result = await exec.apply(this, arguments);
      setInCache(key, result, this.cacheTTL);
      return result;
    };

  } catch (error) {
    connectionAttempts++;
    console.error(`MongoDB connection attempt ${connectionAttempts} failed:`, error);

    if (connectionAttempts >= maxAttempts) {
      console.error(`Failed to connect to MongoDB after ${maxAttempts} attempts. Exiting...`);
      process.exit(1);
    } else {
      const retryDelay = Math.min(connectionAttempts * 5000, 30000);
      console.error(`Retrying to connect in ${retryDelay / 1000} seconds...`);
      setTimeout(connectToMongoDB, retryDelay);
    }
  }
};

// Simple in-memory cache implementation
const cache = new Map();

function getFromCache(key) {
  const item = cache.get(key);
  if (item && item.expiry > Date.now()) {
    return item.value;
  }
  cache.delete(key);
  return null;
}

function setInCache(key, value, ttl) {
  cache.set(key, {
    value,
    expiry: Date.now() + ttl * 1000
  });
}

module.exports = connectToMongoDB;