const redis = require('redis');
require('dotenv').config();

const redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    socket: {
        connectTimeout: 10000, // 10 seconds
        readTimeout: 10000,    // 10 seconds
        keepAlive: 10000       // 10 seconds
      }
});

redisClient.on('connect', () => {
    console.log('Connected to Redis');
    redisClient.dbSize().then(size => {
        console.log(`Number of keys in the database: ${size}`);
    }).catch(err => {
        console.error('Error fetching DB size:', err);
    });
});

redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
});

(async () => {
    try {
        await redisClient.connect();
        console.log('Redis client connected successfully');
    } catch (err) {
        console.error('Error connecting to Redis:', err);
    }
})();

module.exports = redisClient;
