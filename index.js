// // const apm = require('elastic-apm-node').start({
// //   serviceName: 'chat-app',           // Name of your app
// //   serverUrl: 'http://localhost:8200' // APM Server URL (ensure it's correctly configured)
// // });

// const express = require("express");
// const cors = require("cors");
// const morgan = require("morgan");
// const http = require("http");
// const path = require("path");
// const { Server } = require("socket.io");
// const { availableParallelism } = require("node:os");
// const cluster = require("node:cluster");
// const { createAdapter, setupPrimary } = require("@socket.io/cluster-adapter");
// const cookieParser = require("cookie-parser");

// const connectToMongoDB = require("./src/config/mongoDB");

// const User = require("./src/models/userModel");
// const authRoutes=require("./src/routes/authRoutes");
// const chatRoutes=require("./src/routes/chatRoutes");

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

// const app = express();
// const server = http.createServer(app);

// server.keepAliveTimeout = 61 * 1000;
// server.setTimeout(2*60000);
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//   },
//   connectionStateRecovery: true,
//   adapter: createAdapter(),
// });

// require("./src/sockets/chat")(io);

// // app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// // app.use(cookieParser());
// app.use(morgan("dev"));

// // app.use(express.static(path.join(__dirname, "public")));

// app.use((req, res, next) => {
//   req.io = io;
//   next();
// });


// async function connectToDB() {
//   try {
//     await connectToMongoDB();
//   } catch (error) {
//     console.log("Error connecting to MongoDB", error);
//     process.exit(1);
//   }
// }

// connectToDB();

// app.use("/auth", authRoutes);
// app.use("/chat", chatRoutes);

// const SERVER_PORT = process.env.SERVER_PORT || 3000;

// app.get("/", (req, res) => {
//   res.redirect('/index.html')
//   res.send("Hello World from chat app");
// });

// io.on('connection', (socket) => {
//   console.log("Made socket connection")
// });

// server.listen(SERVER_PORT, () => {
//   console.log(`Server is listening at the port: ${SERVER_PORT}`);
//   const start = performance.now();
//   server.on('listening', () => {
//     const end = performance.now();
//     console.log(`Server startup time: ${(end - start) / 1000}s`);
//   });
// });

// app.listen(SERVER_PORT, () => {
//   console.log(`Server running on port ${SERVER_PORT}`);
// });

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/cluster-adapter");

const connectToMongoDB = require("./src/config/mongoDB");

const authRoutes = require("./src/routes/authRoutes");
const chatRoutes = require("./src/routes/chatRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
  connectionStateRecovery: true,
  adapter: createAdapter(),
});

require("./src/sockets/chat")(io);

// app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());
app.use(morgan("dev"));

app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  console.log("Setting io in req");
  req.io = io;
  next();
});

// async function connectToDB() {
//   try {
//     await connectToMongoDB();
//     console.log("Connected to MongoDB");
//   } catch (error) {
//     console.log("Error connecting to MongoDB", error);
//     process.exit(1);
//   }
// }

// connectToDB();

const startServer = async () => {
  try {
    await connectToMongoDB();  // Ensure connection is complete
    console.log("MongoDB connected, starting server...");

    // Routes only start after DB connection is established
    app.use("/auth", authRoutes);
    app.use("/chat", chatRoutes);

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

module.exports = { server,app };
