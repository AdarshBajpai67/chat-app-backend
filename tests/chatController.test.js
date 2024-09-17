const request = require("supertest");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const User = require("../src/models/userModel");
const Message = require("../src/models/messageModel");
const redisClient = require("../src/config/redis");
const { server } = require("../index");
const connectToMongoDB = require("../src/config/mongoDB");

describe("Chat Controller", () => {
  let adminTokens = [];
  let studentTokens = [];
  let adminIds = [];
  let studentIds = [];

  beforeAll(async () => {
    console.log("Starting tests...");
    await connectToMongoDB();

    await User.deleteMany({});
    console.log("Deleted existing users");

    await Message.deleteMany({});
    console.log("Deleted existing messages");

    for (let i = 0; i < 5000; i++) {
      const admin = new User({
        userName: `Admin${i}`,
        userEmail: `admin${i}@example.com`,
        userPassword: "password",
        userRole: "admin",
      });
      await admin.save();
      adminIds.push(admin._id);
        console.log("Created admin:", admin.userName);

      const student = new User({
        userName: `Student${i}`,
        userEmail: `student${i}@example.com`,
        userPassword: "password",
        userRole: "student",
      });
      await student.save();
      studentIds.push(student._id);
        console.log("Created student:", student.userName);
    }

    for (let id of adminIds) {
      const res = await request(server)
        .post("/auth/login")
        .send({
          userEmail: `admin${adminIds.indexOf(id)}@example.com`,
          userPassword: "password",
        });
      adminTokens.push(res.body.token);
      console.log(`Admin login successful for ID ${id}`);
    }

    for (let id of studentIds) {
      const res = await request(server)
        .post("/auth/login")
        .send({
          userEmail: `student${studentIds.indexOf(id)}@example.com`,
          userPassword: "password",
        });
      studentTokens.push(res.body.token);
      console.log(`Student login successful for ID ${id}`);
    }

    const directory = path.join(__dirname, 'tests', 'loadTests');
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
  }
    const adminTokensPath = path.join(directory, "adminTokens.json");
    const studentTokensPath = path.join(directory, "studentTokens.json");
    const adminIdsPath = path.join(directory, "adminIds.json");
    const studentIdsPath = path.join(directory, "studentIds.json");
    // fs.mkdirSync(directory, { recursive: true });

    // Write JSON data to files
    fs.writeFileSync(adminTokensPath, JSON.stringify(adminTokens, null, 2));
    fs.writeFileSync(studentTokensPath, JSON.stringify(studentTokens, null, 2));
    fs.writeFileSync(adminIdsPath, JSON.stringify(adminIds, null, 2));
    fs.writeFileSync(studentIdsPath, JSON.stringify(studentIds, null, 2));

    console.log("Test data files created successfully.");
  }, 60 * 60000);

  afterAll(async () => {
    // await User.deleteMany({});
    // await Message.deleteMany({});
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");

    await redisClient.quit(); // Ensure Redis client is properly closed
    console.log("Disconnected from Redis");

    server.close(); // Close the server after tests
    console.log("Server closed");
  });

  test(
    "students should be able to send messages to admins",
    async () => {
      for (let i = 0; i < studentTokens.length; i++) {
        const res = await request(server)
          .post("/chat/send")
          .set("Authorization", `Bearer ${studentTokens[i]}`)
          .send({ receiverId: adminIds[i], message: "Hello Admin" });

        console.log("Student message response:", res.body);
        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe("Message sent successfully");
      }
    },
    60 * 60000
  );

  test(
    "admins should be able to send messages to students and other admins",
    async () => {
      for (let i = 0; i < adminTokens.length; i++) {
        // Send message to a student
        const resStudent = await request(server)
          .post("/chat/send")
          .set("Authorization", `Bearer ${adminTokens[i]}`)
          .send({ receiverId: studentIds[i], message: "Hello Student" });

        console.log("Admin message to student response:", resStudent.body);
        expect(resStudent.statusCode).toBe(201);
        expect(resStudent.body.message).toBe("Message sent successfully");

        // Send message to another admin
        const resAdmin = await request(server)
          .post("/chat/send")
          .set("Authorization", `Bearer ${adminTokens[i]}`)
          .send({
            receiverId: adminIds[(i + 1) % adminIds.length],
            message: "Hello Admin",
          });

        console.log("Admin message to another admin response:", resAdmin.body);
        expect(resAdmin.statusCode).toBe(201);
        expect(resAdmin.body.message).toBe("Message sent successfully");
      }
    },
    60 * 60000
  );

  test("Generate test data", async () => {
    // Just a placeholder test to ensure the script runs
    expect(adminTokens.length).toBeGreaterThan(0);
    expect(studentTokens.length).toBeGreaterThan(0);
  });
});

