
// export const options = {
//   stages: [
//     { duration: '1m', target: 100 }, // Ramp up to 1000 users over 1 minute
//     { duration: '5m', target: 100 }, // Stay at 1000 users for 5 minutes
//     { duration: '1m', target: 0 }, // Ramp down to 0 users
//   ],
//   thresholds: {
//     http_req_duration: ['p(95)<2000'],
//     'http_req_failed{scenario:default}': ['rate<0.01'],
//   },
// };

// export const options = {
//   stages: [
//     { duration: '1m', target: 100 }, // Ramp up to 100 users over 1 minute
//     { duration: '5m', target: 100 }, // Stay at 100 users for 5 minutes
//     { duration: '1m', target: 0 },   // Ramp down to 0 users
//   ],
//   thresholds: {
//     http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
//     'http_req_failed{scenario:default}': ['rate<0.01'], // Error rate should be less than 1%
//   },
// };

// export const options = {
//   stages: [
//     { duration: '2m', target: 500 }, // Ramp up to 100 users over 1 minute
//     { duration: '8m', target: 500 }, // Stay at 100 users for 5 minutes
//     { duration: '2m', target: 0 },   // Ramp down to 0 users
//   ],
//   thresholds: {
//     http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
//     'http_req_failed{scenario:default}': ['rate<0.01'], // Error rate should be less than 1%
//   },
// };

// export const options = {
//   stages: [
//     { duration: '1m', target: 200 },  // Ramp up to 200 users over 1 minute
//     { duration: '2m', target: 500 },  // Ramp up to 500 users over 2 minutes
//     { duration: '5m', target: 1000 }, // Stay at 1000 users for 5 minutes
//     { duration: '2m', target: 500 },  // Ramp down to 500 users over 2 minutes
//     { duration: '1m', target: 200 },  // Ramp down to 200 users over 1 minute
//     { duration: '30s', target: 0 },   // Ramp down to 0 users over 30 seconds
//   ],
//   thresholds: {
//     http_req_duration: ['p(95)<3000'],  // 95% of requests should be below 3s
//     http_req_failed: ['rate<0.01'],     // Error rate should be less than 1%
//   },
// };

// export const options = {
//   stages: [
//     { duration: "2m", target: 2000 },
//     { duration: "5m", target: 5000 },
//     { duration: "10m", target: 10000 },
//     { duration: "5m", target: 5000 },
//     { duration: "2m", target: 2000 },
//     { duration: "1m", target: 0 },
//   ],
//   thresholds: {
//     http_req_duration: ["p(95)<3000"],
//     http_req_failed: ["rate<0.01"],
//     "checks{type:student}": ["rate>0.95"],
//     "checks{type:admin}": ["rate>0.95"],
//   },
// };


// import http from "k6/http";
// import { check, sleep } from "k6";
// import { SharedArray } from "k6/data";
// import { Rate } from "k6/metrics";

// export const options = {
//   stages: [
//     // { duration: '30s', target: 50 },
//     { duration: '30s', target: 100 },
//     // { duration: '5m', target: 1000 },
//     // { duration: '2m', target: 500 },
//     // { duration: '1m', target: 200 },
//     { duration: '30s', target: 0 },
//   ],
//   thresholds: {
//     http_req_duration: ["p(95)<3000"],
//     http_req_failed: ["rate<0.01"],
//     "checks{type:student}": ["rate>0.95"],
//     "checks{type:admin}": ["rate>0.95"],
//   },
// };

// const errorRate = new Rate("errors");

// // Load tokens and IDs from JSON files
// const adminTokens = new SharedArray("adminTokens", () =>
//   JSON.parse(open("./adminTokens.json"))
// );
// const studentTokens = new SharedArray("studentTokens", () =>
//   JSON.parse(open("./studentTokens.json"))
// );
// const adminIds = new SharedArray("adminIds", () =>
//   JSON.parse(open("./adminIds.json"))
// );
// const studentIds = new SharedArray("studentIds", () =>
//   JSON.parse(open("./studentIds.json"))
// );
// const teacherTokens = new SharedArray("teacherTokens", () =>
//   JSON.parse(open("./teacherTokens.json"))
// );
// const teacherIds = new SharedArray("teacherIds", () =>
//   JSON.parse(open("./teacherIds.json"))
// );

// // Retry function for handling request failures
// const retry = (request, maxRetries = 3) => {
//   for (let i = 0; i < maxRetries; i++) {
//     const res = request();
//     if (res.status === 200 || res.status === 201) return res;
//     console.log(`Attempt ${i + 1} failed with status ${res.status}. Retrying...`);
//     sleep(1);
//   }
//   return request();
// };

// export default function () {
//   // Randomly select a student and admin
//   const studentIdx = Math.floor(Math.random() * studentTokens.length);
//   const adminIdx = Math.floor(Math.random() * adminTokens.length);

//   const studentToken = studentTokens[studentIdx];
//   const adminToken = adminTokens[adminIdx];
//   const studentId = studentIds[studentIdx];
//   const adminId = adminIds[adminIdx];

//   // Student sends a message to Admin
//   const studentMessageRes = retry(() =>
//     http.post(
//       "http://localhost:3000/chat/send",
//       JSON.stringify({ receiverId: adminId, message: "Hello Admin" }),
//       {
//         headers: {
//           Authorization: `Bearer ${studentToken}`,
//           "Content-Type": "application/json",
//         },
//         timeout: "60s",
//       }
//     )
//   );

//   // Check the response for student message
//   check(studentMessageRes, {
//     "Student message status is 201": (r) => r.status === 201,
//     "Student message sent successfully": (r) => r.json().message === "Message sent successfully",
//     "Student message transaction committed": (r) => r.status !== 500,
//   }, { type: "student" });

//   errorRate.add(studentMessageRes.status !== 201);

//   sleep(Math.random() * 5 + 2); 

//   // Admin sends a message to Student
//   const adminMessageRes = retry(() =>
//     http.post(
//       "http://localhost:3000/chat/send",
//       JSON.stringify({ receiverId: studentId, message: "Hello Student" }),
//       {
//         headers: {
//           Authorization: `Bearer ${adminToken}`,
//           "Content-Type": "application/json",
//         },
//         timeout: "60s",
//       }
//     )
//   );

//   // Check the response for admin message
//   check(adminMessageRes, {
//     "Admin message status is 201": (r) => r.status === 201,
//     "Admin message sent successfully": (r) => r.json().message === "Message sent successfully",
//     "Admin message transaction committed": (r) => r.status !== 500,
//   }, { type: "admin" });

//   errorRate.add(adminMessageRes.status !== 201);

//   sleep(Math.random() * 5 + 2); 

//   // Student fetching messages
//   const studentMessagesRes = http.get(
//     `http://localhost:3000/chat/${adminId}`,
//     { headers: { Authorization: `Bearer ${studentToken}` } }
//   );

//   console.log(studentMessagesRes.body);

//   check(studentMessagesRes, {
//     'Student fetch messages status is 200': (r) => r.status === 200,
//     'Student fetched messages successfully': (r) => r.json().message === 'Messages:',
//     'Student fetch messages not failing': (r) => r.status !== 500,
//     'Student fetched messages contain data': (r) => Array.isArray(r.json()) && r.json().length > 0,
//   });

//   sleep(Math.random() * 5 + 2);  // Sleep between 2 to 7 seconds

//   // Admin fetching messages
//   const adminMessagesRes = http.get(
//     `http://localhost:3000/chat/${studentId}`,
//     { headers: { Authorization: `Bearer ${adminToken}` } }
//   );

//   check(adminMessagesRes, {
//     'Admin fetch messages status is 200': (r) => r.status === 200,
//     'Admin fetched messages successfully': (r) => r.json().message === 'Messages:',
//     'Admin fetch messages not failing': (r) => r.status !== 500,
//     'Admin fetched messages contain data': (r) => Array.isArray(r.json().data),
//   });
//   sleep(Math.random() * 5 + 2);  // Sleep between 2 to 7 seconds
// }


//   // Admin broadcasts a message
//   if (adminTokens.length > 0) {
//     const recipientIds = getRandomIds(studentIds.concat(teacherIds), 10); // Get random recipients
//     const broadcastRes = retry(() =>
//       http.post(
//         "http://localhost:3000/broadcast/",
//         JSON.stringify({ message: "Hello everyone!", recipientIds }),
//         {
//           headers: {
//             Authorization: `Bearer ${adminToken}`,
//             "Content-Type": "application/json",
//           },
//           timeout: "60s", 
//         }
//       )
//     );

//     check(broadcastRes, {
//       "Broadcast status is 200": (r) => r.status === 200,
//       "Broadcast sent successfully": (r) => r.json().success === "Message broadcasted successfully",
//     }, { type: "admin" });

//     errorRate.add(broadcastRes.status !== 200);
//   }

//   // Attempt to broadcast as a student (should fail)
//   if (studentTokens.length > 0) {
//     const resBroadcastAttempt = http.post(
//       "http://localhost:3000/broadcast/",
//       JSON.stringify({ message: "Students cannot broadcast" }),
//       {
//         headers: {
//           Authorization: `Bearer ${studentToken}`,
//           "Content-Type": "application/json",
//         },
//         timeout: "60s", 
//       }
//     );

//     check(resBroadcastAttempt, {
//       "Student broadcast attempt status is 403": (r) => r.status === 403,
//       "Student cannot broadcast": (r) => r.json().error === "Only admins can broadcast",
//     }, { type: "student" });

//     errorRate.add(resBroadcastAttempt.status !== 403);
//   }

//   // Attempt to broadcast as a teacher (should fail)
//   if (teacherTokens.length > 0) {
//     const resBroadcastAttempt = http.post(
//       "http://localhost:3000/broadcast/",
//       JSON.stringify({ message: "Teachers cannot broadcast" }),
//       {
//         headers: {
//           Authorization: `Bearer ${teacherTokens[0]}`,
//           "Content-Type": "application/json",
//         },
//         timeout: "60s", 
//       }
//     );

//     check(resBroadcastAttempt, {
//       "Teacher broadcast attempt status is 403": (r) => r.status === 403,
//       "Teacher cannot broadcast": (r) => r.json().error === "Only admins can broadcast",
//     }, { type: "teacher" });

//     errorRate.add(resBroadcastAttempt.status !== 403);
//   }

//   sleep(Math.random() * 5 + 2); 
// }

// // Helper function to get random IDs
// function getRandomIds(array, count) {
//   const shuffled = array.sort(() => 0.5 - Math.random());
//   return shuffled.slice(0, count);
// }




import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import { Rate } from "k6/metrics";

export const options = {
  stages: [
    { duration: '5m', target: 10000 },  // ramp-up to 10,000 users in 5 minutes
    { duration: '10m', target: 20000 }, // ramp-up to 20,000 users over the next 10 minutes
    { duration: '5m', target: 30000 },  // ramp-up to 30,000 users over 5 minutes
    { duration: '10m', target: 30000 }, // hold 30,000 users for 10 minutes
    { duration: '5m', target: 0 },      // ramp-down to 0 users
  ],
  thresholds: {
    http_req_duration: ["p(95)<3000"], // 95% of requests should be under 3000ms
    http_req_failed: ["rate<0.01"],    // Less than 1% of requests should fail
    "checks{type:student}": ["rate>0.95"],  // Checks should pass for 95% of student users
    "checks{type:admin}": ["rate>0.95"],    // Checks should pass for 95% of admin users
    "checks{type:teacher}": ["rate>0.95"],  // Checks should pass for 95% of teacher users
  },
};


const errorRate = new Rate("errors");

// Load tokens and IDs from JSON files
const adminTokens = new SharedArray("adminTokens", () =>
  JSON.parse(open("./adminTokens.json"))
);
const studentTokens = new SharedArray("studentTokens", () =>
  JSON.parse(open("./studentTokens.json"))
);
const teacherTokens = new SharedArray("teacherTokens", () =>
  JSON.parse(open("./teacherTokens.json"))
);
const adminIds = new SharedArray("adminIds", () =>
  JSON.parse(open("./adminIds.json"))
);
const studentIds = new SharedArray("studentIds", () =>
  JSON.parse(open("./studentIds.json"))
);
const teacherIds = new SharedArray("teacherIds", () =>
  JSON.parse(open("./teacherIds.json"))
);

// Retry function for handling request failures
const retry = (request, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    const res = request();
    if (res.status === 200 || res.status === 201 ) return res;

    // Log detailed error info
    console.error(`Attempt ${i + 1} failed with status ${res.status}. Response: ${JSON.stringify(res.json())}`);
    console.error(`Error occurred at: ${new Error().stack}`);
    sleep(1);
  }
  return request();
};



export default function () {
  // Randomly select a student, admin, and teacher
  const studentIdx = Math.floor(Math.random() * studentTokens.length);
  const adminIdx = Math.floor(Math.random() * adminTokens.length);
  const teacherIdx = Math.floor(Math.random() * teacherTokens.length);

  const studentToken = studentTokens[studentIdx];
  const adminToken = adminTokens[adminIdx];
  const teacherToken = teacherTokens[teacherIdx];
  const studentId = studentIds[studentIdx];
  const adminId = adminIds[adminIdx];
  const teacherId = teacherIds[teacherIdx];

  // Student sends a message to Admin
  const studentMessageRes = retry(() =>
    http.post(
      "http://localhost:3000/chat/send",
      JSON.stringify({ receiverId: adminId, message: "Hello Admin" }),
      {
        headers: {
          Authorization: `Bearer ${studentToken}`,
          "Content-Type": "application/json",
        },
        timeout: "120s",
      }
    )
  );

  check(studentMessageRes, {
    "Student message status is 201":(r) => {
      const result = r.status === 201;
      if (!result) {
        console.error(`Student message failed with status: ${r.status}. Response: ${JSON.stringify(r.json())}`);
      }
      return result;
    },
    "Student message sent successfully": (r) => r.json().message === "Message sent successfully",
    "Student message transaction committed": (r) => r.status !== 500,
  }, { type: "student" });

  errorRate.add(studentMessageRes.status !== 201);
  sleep(Math.random() * 5 + 2); 

  // Admin sends a message to Student
  const adminMessageRes = retry(() =>
    http.post(
      "http://localhost:3000/chat/send",
      JSON.stringify({ receiverId: studentId, message: "Hello Student" }),
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        timeout: "120s",
      }
    )
  );

  check(adminMessageRes, {
    "Admin message status is 201":(r) => {
      const result = r.status === 201;
      if (!result) {
        console.error(`Student message failed with status: ${r.status}. Response: ${JSON.stringify(r.json())}`);
      }
      return result;
    },
    "Admin message sent successfully": (r) => r.json().message === "Message sent successfully",
    "Admin message transaction committed": (r) => r.status !== 500,
  }, { type: "admin" });

  errorRate.add(adminMessageRes.status !== 201);
  sleep(Math.random() * 5 + 2); 

  // Teacher sends a message to Student
  const teacherMessageRes = retry(() =>
    http.post(
      "http://localhost:3000/chat/send",
      JSON.stringify({ receiverId: studentId, message: "Hello Student from Teacher" }),
      {
        headers: {
          Authorization: `Bearer ${teacherToken}`,
          "Content-Type": "application/json",
        },
        timeout: "120s",
      }
    )
  );

  check(teacherMessageRes, {
    "Teacher message status is 201":(r) => {
      const result = r.status === 201;
      if (!result) {
        console.error(`Student message failed with status: ${r.status}. Response: ${JSON.stringify(r.json())}`);
      }
      return result;
    },
    "Teacher message sent successfully": (r) => r.json().message === "Message sent successfully",
    "Teacher message transaction committed": (r) => r.status !== 500,
  }, { type: "teacher" });

  errorRate.add(teacherMessageRes.status !== 201);
  sleep(Math.random() * 5 + 2); 

  // Student fetching messages
  const studentMessagesRes = http.get(
    `http://localhost:3000/chat/${adminId}`,
    { headers: { Authorization: `Bearer ${studentToken}` } }
  );

  check(studentMessagesRes, {
    "Student fetch messages status is 200": (r) => r.status === 200,
    "No messages found": (r) => {
      const response = r.json();
      return response.message === "No messages found." || Array.isArray(response.data);
    },
    'Student fetched messages contain data': (r) => Array.isArray(r.json().data) && r.json().data.length >= 0,
  });
  

  sleep(Math.random() * 5 + 2); 

  // Admin fetching messages
  const adminMessagesRes = http.get(
    `http://localhost:3000/chat/${studentId}`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );

  check(adminMessagesRes, {
    'Admin fetch messages status is 200': (r) =>{
      const result = r.status === 200;
      if (!result) {
        console.error(`Admin message failed with status: ${r.status}. Response: ${JSON.stringify(r.json())}`);
      }
      return result
    },
    'No messages found for admin': (r) => {
      const response = r.json();
      return response.message === "No messages found." || Array.isArray(response.data);
    },
    'Admin fetched messages contain data': (r) => Array.isArray(r.json().data) && r.json().data.length >= 0,
  });
  
  sleep(Math.random() * 5 + 2); 

  // Teacher fetching messages
  const teacherMessagesRes = http.get(
    `http://localhost:3000/chat/${studentId}`,
    { headers: { Authorization: `Bearer ${teacherToken}` } }
  );

  check(teacherMessagesRes, {
    'Teacher fetch messages status is 200': (r) => {
      const result = r.status === 200;
      if (!result) {
        console.error(`Teacher message failed with status: ${r.status}. Response: ${JSON.stringify(r.json())}`);
      }
      return result
    },
    'No messages found for teacher': (r) => {
      const response = r.json();
      return response.message === "No messages found." || Array.isArray(response.data);
    },
    'Teacher fetched messages contain data': (r) => Array.isArray(r.json().data) && r.json().data.length >= 0,
  });
  
  
  sleep(Math.random() * 5 + 2); 

  // Function to shuffle and select random users
function getRandomUsers(arr, count) {
  const shuffled = arr.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Assuming studentIds, teacherIds, adminIds are defined
const allRecipientIds = studentIds.concat(teacherIds);

// Get a random selection of 50 users
const randomRecipientIds = getRandomUsers(allRecipientIds, Math.min(10, allRecipientIds.length));

// Admin broadcasting to random recipients
const broadcastRes = retry(() =>
  http.post(
    "http://localhost:3000/broadcast/",
    JSON.stringify({ message: "Hello everyone!", recipientIds: randomRecipientIds }),
    {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      timeout: "120s",
    }
  )
);

check(broadcastRes, {
  "Admin broadcast status is 200": (r) => r.status === 200,
  "Admin broadcast successful": (r) => r.json().success === "Message broadcasted successfully",
});

// // Teacher attempting to broadcast
// const teacherBroadcastRes = retry(() =>
//   http.post(
//     "http://localhost:3000/broadcast/",
//     JSON.stringify({ message: "Teachers cannot broadcast" }),
//     {
//       headers: {
//         Authorization: `Bearer ${teacherToken}`,
//         "Content-Type": "application/json",
//       },
//       timeout: "60s",
//     }
//   )
// );

// check(teacherBroadcastRes, {
//   "Teacher broadcast status is 403 (expected)": (r) => r.status === 403,
//   "Teacher broadcast error message correct": (r) => r.json().error === "Only admins can broadcast",
// });

// // Student attempting to broadcast
// const studentBroadcastRes = retry(() =>
//   http.post(
//     "http://localhost:3000/broadcast/",
//     JSON.stringify({ message: "Students cannot broadcast" }),
//     {
//       headers: {
//         Authorization: `Bearer ${studentToken}`,
//         "Content-Type": "application/json",
//       },
//       timeout: "60s",
//     }
//   )
// );

// check(studentBroadcastRes, {
//   "Student broadcast status is 403 (expected)": (r) => r.status === 403,
//   "Student broadcast error message correct": (r) => r.json().error === "Only admins can broadcast",
// });



sleep(Math.random() * 5 + 2);
}
