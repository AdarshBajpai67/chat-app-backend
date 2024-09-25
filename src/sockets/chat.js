const { redisClient, redisSubscriber } = require("../config/redis");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Subscribe to the broadcast channel on Redis
    

      
        redisSubscriber.subscribe("broadcastChannel", (message) => {
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
    socket.on("message", (messageData) => {
      const { receiverId, message } = messageData;
      console.log(`Message received for user ${receiverId}:`, message);

      // Emit message to the specific user only
      io.to(receiverId).emit("chat message", message);
    });

    // Handle client disconnection
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};
