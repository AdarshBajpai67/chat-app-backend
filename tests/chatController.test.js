const request = require("supertest");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const User = require("../src/models/userModel");
const Message = require("../src/models/messageModel");
const Group = require("../src/models/groupModel");
const {redisClient,redisSubscriber} = require("../src/config/redis");
const { server } = require("../index");
const connectToMongoDB = require("../src/config/mongoDB");
const {stopCleanupInterval}=require("../src/controllers/chatController")
const {stopCaching}=require("../src/controllers/groupController")

describe("Chat Controller", () => {
  let adminTokens = [];
  let studentTokens = [];
  let teacherTokens = [];
  let adminIds = [];
  let studentIds = [];
  let teacherIds = [];
  let groupIds = [];

 beforeAll(async () => {
    console.log("Starting tests...");
    await connectToMongoDB();

    await User.deleteMany({});
    console.log("Deleted existing users");

    await Message.deleteMany({});
    console.log("Deleted existing messages");

    for (let i = 0; i < 5; i++) {
      const admin = new User({
        firstName: `AdminFirst${i}`,
        lastName: `AdminLast${i}`,
        userEmail: `admin${i}@example.com`,
        password: "password",
        userType: "ADMIN", // Admin user
      });
      await admin.save();
      adminIds.push(admin._id);
      // console.log("Created admin:", `${admin.firstName} ${admin.lastName}`);

      const student = new User({
        firstName: `StudentFirst${i}`,
        lastName: `StudentLast${i}`,
        userEmail: `student${i}@example.com`,
        password: "password",
        userType: "USER", // Student user
      });
      await student.save();
      studentIds.push(student._id);
      // console.log("Created student:", `${student.firstName} ${student.lastName}`);

      const teacher = new User({
        firstName: `TeacherFirst${i}`,
        lastName: `TeacherLast${i}`,
        userEmail: `teacher${i}@example.com`,
        password: "password",
        userType: "TEACHER", // Teacher user
      });
      await teacher.save();
      teacherIds.push(teacher._id);
      console.log("Created teacher:", `${teacher.firstName} ${teacher.lastName}`);
    }

    // Log in admins, students, and teachers to get tokens
    for (let id of adminIds) {
      const res = await request(server)
        .post("/auth/login")
        .send({
          userEmail: `admin${adminIds.indexOf(id)}@example.com`,
          password: "password",
        });
      adminTokens.push(res.body.token);
      console.log(`Admin login successful for ID ${id}`);
    }

    for (let id of studentIds) {
      const res = await request(server)
        .post("/auth/login")
        .send({
          userEmail: `student${studentIds.indexOf(id)}@example.com`,
          password: "password",
        });
      studentTokens.push(res.body.token);
      console.log(`Student login successful for ID ${id}`);
    }

    for (let id of teacherIds) {
      const res = await request(server)
        .post("/auth/login")
        .send({
          userEmail: `teacher${teacherIds.indexOf(id)}@example.com`,
          password: "password",
        });
      teacherTokens.push(res.body.token);
      console.log(`Teacher login successful for ID ${id}`);
    }

    for (let i = 0; i < adminTokens.length; i++) {
      const groupRes = await request(server)
        .post("/group/create")
        .set("Authorization", `Bearer ${adminTokens[i]}`)
        .send({
          groupName: `Group${i}`,
          memberIds: [studentIds[i], teacherIds[i]],
        });
  
      if (groupRes.status === 201) {
        groupIds.push(groupRes.body.group._id);
        console.log(`Group ${i} created with ID: ${groupRes.body.group._id}`);
      }
    }

    const directory = path.join(__dirname, "tests", "loadTests");
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    const adminTokensPath = path.join(directory, "adminTokens.json");
    const studentTokensPath = path.join(directory, "studentTokens.json");
    const teacherTokensPath = path.join(directory, "teacherTokens.json");
    const adminIdsPath = path.join(directory, "adminIds.json");
    const studentIdsPath = path.join(directory, "studentIds.json");
    const teacherIdsPath = path.join(directory, "teacherIds.json");
    const groupIdsPath = path.join(directory, "groupIds.json");

    // Write JSON data to files
    fs.writeFileSync(adminTokensPath, JSON.stringify(adminTokens, null, 2));
    fs.writeFileSync(studentTokensPath, JSON.stringify(studentTokens, null, 2));
    fs.writeFileSync(teacherTokensPath, JSON.stringify(teacherTokens, null, 2));
    fs.writeFileSync(adminIdsPath, JSON.stringify(adminIds, null, 2));
    fs.writeFileSync(studentIdsPath, JSON.stringify(studentIds, null, 2));
    fs.writeFileSync(teacherIdsPath, JSON.stringify(teacherIds, null, 2));
    fs.writeFileSync(groupIdsPath, JSON.stringify(groupIds, null, 2));

    console.log("Test data files created successfully.");
  }, 2*60 * 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await redisClient.disconnect();
    await redisSubscriber.disconnect();
    stopCleanupInterval();   //chatController
    stopCaching();  //groupController
    server.close();
    console.log("Disconnected from MongoDB and Redis, and closed server");
    
    // Cleanup temporary files if needed
    // const directory = path.join(__dirname, "tests", "loadTests");
    // fs.rmSync(directory, { recursive: true, force: true });
  });

  // Parameterized tests for sending messages
  const roles = [
    { tokens: adminTokens, ids: studentIds, expectedStatus: 201, description: "admin to student" },
    { tokens: adminTokens, ids: teacherIds, expectedStatus: 201, description: "admin to teacher" },
    { tokens: adminTokens, ids: adminIds, expectedStatus: 201, description: "admin to admin" },
    { tokens: teacherTokens, ids: studentIds, expectedStatus: 201, description: "teacher to student" },
    { tokens: teacherTokens, ids: teacherIds, expectedStatus: 201, description: "teacher to teacher" },
    { tokens: teacherTokens, ids: adminIds, expectedStatus: 201, description: "teacher to admin" },
    { tokens: studentTokens, ids: studentIds, expectedStatus: 403, description: "student to student" },
    { tokens: studentTokens, ids: teacherIds, expectedStatus: 201, description: "student to teacher" },
    { tokens: studentTokens, ids: adminIds, expectedStatus: 201, description: "student to admin" },
  ];
  
  test.each(roles)("should handle %s messages correctly", async ({ tokens, ids, expectedStatus, description }) => {
    for (let i = 0; i < tokens.length; i++) {
      const receiverIds = getRandomIds(ids, 1);
      console.log(`Testing ${description} - receiver:`, receiverIds);
      // console.log("receiverIds: ", {receiverId:receiverIds[0]});
      // const decodedToken = process.env.JWT_SECRET.decode(tokens[i]);
      // console.log(`${description} token payload:`, decodedToken);
  
      const res = await request(server)
        .post("/chat/send")
        .set("Authorization", `Bearer ${tokens[i]}`)
        .send({ receiverId: receiverIds[0], message: `Hello ${description}` });
  
      expect(res.statusCode).toBe(expectedStatus);
      if (expectedStatus === 201) {
        expect(res.body.message).toBe("Message sent successfully");
      } else {
        expect(res.body.error).toBe("Only admins and teachers can send messages to user");
      }
    }
  }, 120 * 60000);

  function getRandomIds(array, count) {
    const shuffled = array.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  test("Only admins should be able to broadcast messages", async () => {
    console.log("Starting broadcast tests...");
    
    for (let i = 0; i < adminTokens.length; i++) {
      const recipientIds = getRandomIds(studentIds.concat(teacherIds), 10); // Get random recipients
      // console.log("Recipient IDs:", recipientIds);
      const resBroadcast = await request(server)
        .post("/broadcast/")
        .set("Authorization", `Bearer ${adminTokens[i]}`)
        .send({ message: "Hello everyone!", recipientIds });

      console.log("Admin broadcast response:", resBroadcast.body);
      expect(resBroadcast.statusCode).toBe(200);
      expect(resBroadcast.body.success).toBe("Message broadcasted successfully");
    }

    // Attempt to broadcast as a student
    for (let i = 0; i < studentTokens.length; i++) {
      const resBroadcastAttempt = await request(server)
        .post("/broadcast/")
        .set("Authorization", `Bearer ${studentTokens[i]}`)
        .send({ message: "Students cannot broadcast" });

      console.log("Student broadcast attempt response:", resBroadcastAttempt.body);
      expect(resBroadcastAttempt.statusCode).toBe(403);
      expect(resBroadcastAttempt.body.error).toBe("Only admins can broadcast");
    }

    // Attempt to broadcast as a teacher
    for (let i = 0; i < teacherTokens.length; i++) {
      const resBroadcastAttempt = await request(server)
        .post("/broadcast/")
        .set("Authorization", `Bearer ${teacherTokens[i]}`)
        .send({ message: "Teachers cannot broadcast" });

      console.log("Teacher broadcast attempt response:", resBroadcastAttempt.body);
      expect(resBroadcastAttempt.statusCode).toBe(403);
      expect(resBroadcastAttempt.body.error).toBe("Only admins can broadcast");
    }
  }, 120 * 60000);

  // const groupOperations = [
  //   // { tokens: adminTokens, ids: studentIds, expectedStatus: 201, description: "admin creates group" },
  //   { tokens: adminTokens, ids: teacherIds, expectedStatus: 201, description: "admin adds teachers to group" },

  //   { tokens: teacherTokens, ids: studentIds, expectedStatus: [200,400].includes(), description: "teacher sends message to group" },
  //   { tokens: studentTokens, ids: studentIds, expectedStatus: [200,400].includes(), description: "student sends message to group" },
  //   { tokens: adminTokens, ids: adminIds, expectedStatus: [200,400].includes(), description: "admin sends message to group" },
  //   // { tokens: studentTokens, ids: teacherIds, expectedStatus: 403, description: "student tries to send message to group" },
  // ];
  
  // test.each(groupOperations)("should handle %s group operations correctly", async ({ tokens, ids, expectedStatus, description }) => {
  //   for (let i = 0; i < tokens.length; i++) {
  //     const receiverIds = getRandomIds(ids, 1);
  //     console.log(`Testing ${description} - receiver:`, receiverIds);
  
  //     // Test group creation
  //     if (description === "admin creates group") {
  //       const groupRes = await request(server)
  //         .post("/group/create")
  //         .set("Authorization", `Bearer ${tokens[i]}`)
  //         .send({ groupName: `Test Group ${i}`, memberIds: receiverIds });
  
  //       expect(groupRes.statusCode).toBe(expectedStatus);
  //       if (expectedStatus === 201) {
  //         expect(groupRes.body.message).toBe("Group created successfully");
  //       } else {
  //         expect(groupRes.body.error).toBe("Only admins can create groups");
  //       }
  //     }
  
  //     // Test sending message to group
  //     if (description === "teacher sends message to group" || description === "student sends message to group"|| description === "admin sends message to group") {
  //       const selectedGroupIds = getRandomIds(groupIds, 1); 
  //       const messageRes = await request(server)
  //         .post("/group/sendMessage")
  //         .set("Authorization", `Bearer ${tokens[i]}`)
  //         .send({ message: `Hello from ${description}`, groupId: selectedGroupIds[0] });
  
  //       expect(messageRes.statusCode).toBe(expectedStatus);
  //       if (expectedStatus === 201) {
  //         expect(messageRes.body.message).toBe("Group message sent successfully");
  //       } 
  //       if (expectedStatus === 403) {
  //         expect(messageRes.body.error).toBe("You are not a member of this group");
  //       }
  //     }
  //   }
  // }, 120 * 60000);
});



// npm test -- --detectOpenHandles
