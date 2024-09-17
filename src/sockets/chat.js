// const redisClient = require('../config/redis');

// module.exports = (io) => {
//     io.on('connection', (socket) => {
//         console.log('New client connected:', socket.id);

//         redisClient.subscribe("broadcastChannel",(message) => {
//             console.log('Message received from Redis:', message);
//             const parsedMessage = JSON.parse(message);
//             console.log('Parsed message:', parsedMessage);
//             parsedMessage.usedIDs.forEach((userID) => {
//                 io.to(userID).emit('message', parsedMessage.message);
//             });
//         });

//         // Handle incoming messages
//         socket.on('message', (messageData) => {
//             console.log('Message received:', messageData);
//             // Broadcast message to all clients
//             io.emit('message', messageData);
//         });

//         // Handle disconnection
//         socket.on('disconnect', () => {
//             console.log('Client disconnected:', socket.id);
//         });
//     });
// };

const redisClient = require("../config/redis");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Subscribe to the broadcast channel on Redis
    redisClient.subscribe("broadcastChannel", (error, message) => {
      if (error) {
        console.error("Redis subscription error:", error);
        return;
      }

      try {
        const parsedMessage = JSON.parse(message);
        console.log("Parsed message:", parsedMessage);

        // Send the message to all intended user IDs
        parsedMessage.usedIDs.forEach((userID) => {
          io.to(userID).emit("message", parsedMessage.message);
        });
      } catch (parseError) {
        console.error("Error parsing Redis message:", parseError);
      }
    });

    // Handle incoming socket messages
    socket.on("chat message", (messageData) => {
      console.log("Message received:", messageData);

      // Broadcast message to all connected clients
      io.emit("chat message", messageData);
    });

    // Handle client disconnection
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};
