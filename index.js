// const apm = require('elastic-apm-node').start({
//   serviceName: 'chat-app',           // Name of your app
//   serverUrl: 'http://localhost:8200' // APM Server URL (ensure it's correctly configured)
// });

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { availableParallelism } = require("node:os");
const cluster = require("node:cluster");
const { createAdapter, setupPrimary } = require("@socket.io/cluster-adapter");
const cookieParser = require("cookie-parser");
const bodyParser = require('body-parser');


const connectToMongoDB = require("./src/config/mongoDB");

const authRoutes=require("./src/routes/authRoutes");
const chatRoutes=require("./src/routes/chatRoutes");
const broadcastRoutes = require("./src/routes/broadcastRoutes");
const groupRoutes = require("./src/routes/groupRoutes");

// if (cluster.isPrimary) {
//   const numProcesses = require("os").cpus().length;
//   for (let i = 0; i < numProcesses; i++) {
//     cluster.fork({
//       SERVER_PORT: 3000 + i,
//     });
//   }
//   setupPrimary();
//   return;
// }

const app = express();
const server = http.createServer(app);

server.keepAliveTimeout = 61 * 1000;
server.setTimeout(2*60000);


const io = new Server(server, {
  cors: {
      origin: "*",
      methods: ["GET", "POST"]
  },
  connectionStateRecovery: true,
  adapter: cluster.isWorker ? createAdapter() : undefined
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
      return next(new Error("Authentication error"));
  }
  // Verify token here if needed
  next();
});

require("./src/sockets/chat")(io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ limit: '1mb', extended: true }));

// Serve static files from a public directory
app.use(express.static(path.join(__dirname, 'public')));

// Attach io to request object for use in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes
app.use("/auth", authRoutes);
app.use("/chat", chatRoutes);
app.use("/broadcast", broadcastRoutes);
app.use("/group", groupRoutes);

// Serve the frontend files
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get("/chat", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});


const startServer = async () => {
  try {
    await connectToMongoDB();  // Ensure connection is complete
    console.log("MongoDB connected, starting server...");

    // Routes only start after DB connection is established
    // app.use("/auth", authRoutes);
    // app.use("/chat", chatRoutes);
    // app.use("/broadcast", broadcastRoutes);
    // app.use("/group", groupRoutes);

    const SERVER_PORT = process.env.SERVER_PORT || 3000;
    server.listen(SERVER_PORT, () => {
      console.log(`Server is listening at port: ${SERVER_PORT}`);
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);  // Stop server startup if DB connection fails
  }
};

startServer();


// app.listen(SERVER_PORT, () => {
//   console.log(`Server running on port ${SERVER_PORT}`);
// });

// const express = require("express");
// const cors = require("cors");
// const morgan = require("morgan");
// const http = require("http");
// const path = require("path");
// const { Server } = require("socket.io");
// const { createAdapter } = require("@socket.io/cluster-adapter");
// const bodyParser = require('body-parser');

// const connectToMongoDB = require("./src/config/mongoDB");

// const authRoutes = require("./src/routes/authRoutes");
// const chatRoutes = require("./src/routes/chatRoutes");
// const broadcastRoutes = require("./src/routes/broadcastRoutes");
// const groupRoutes = require("./src/routes/groupRoutes");

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//   },
//   connectionStateRecovery: true,
//   adapter: createAdapter(),
// });

// require("./src/sockets/chat")(io);
// // console.log("Socket.io initialized.");


// app.use(express.json({ limit: '1mb' }));
// app.use(express.urlencoded({ extended: true }));
// // app.use(cookieParser());
// app.use(morgan("dev"));
// app.use(bodyParser.json({ limit: '1mb' })); // Set the limit according to your needs
// app.use(bodyParser.urlencoded({ limit: '1mb', extended: true }));


// // app.use(express.static(path.join(__dirname, "public")));

// app.use((req, res, next) => {
//   // console.log("Setting io in req");
//   req.io = io;
//   // console.log("io set in req");
//   next();
// });

// app.use((err, req, res, next) => {
//   console.error("Global Error Handler:", err);
//   res.status(500).send("Something broke!");
// });

// app.get("/test", (req, res) => {
//   console.log("Test route hit");
//   res.send("Test route");
// });

// // connectToMongoDB();  // Ensure connection is complete
// //     console.log("MongoDB connected successfully.");


// const startServer = async () => {
//   console.log("Starting server...");
//   try {
//     console.log("Attempting to connect to MongoDB...");
//     await connectToMongoDB();  // Ensure connection is complete
//     console.log("MongoDB connected successfully.");

//     // Routes only start after DB connection is established
//     console.log("Setting up routes...");
//     app.use("/auth", authRoutes);
//     app.use("/chat", chatRoutes);
//     app.use("/broadcast", broadcastRoutes);
//     app.use("/group", groupRoutes);
//     console.log("Routes set up successfully.");

//     const SERVER_PORT = process.env.SERVER_PORT || 3000;
//     server.listen(SERVER_PORT, () => {
//       console.log(`Server is listening at port: ${SERVER_PORT}`);
//     });

//     server.on('error', (err) => {
//       console.error("Server error:", err);
//     });

//   } catch (error) {
//     console.error("Error connecting to MongoDB or starting server:", error);
//     process.exit(1);  // Stop server startup if DB connection fails
//   }
// };

// startServer();

// module.exports = { server, app };