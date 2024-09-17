// import http from 'k6/http';
// import { check, sleep } from 'k6';
// import { SharedArray } from 'k6/data';

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

// const adminTokens = new SharedArray('adminTokens', function () {
//   return JSON.parse(open('./adminTokens.json')); 
// });

// const studentTokens = new SharedArray('studentTokens', function () {
//   return JSON.parse(open('./studentTokens.json'));
// });

// const adminIds = new SharedArray('adminIds', function () {
//   return JSON.parse(open('./adminIds.json')); 
// });

// const studentIds = new SharedArray('studentIds', function () {
//   return JSON.parse(open('./studentIds.json')); 
// });

// export default function () {
//   const studentIdx = Math.floor(Math.random() * studentTokens.length);
//   const adminIdx = Math.floor(Math.random() * adminTokens.length);

//   const studentToken = studentTokens[studentIdx];
//   const adminToken = adminTokens[adminIdx];
//   const studentId = studentIds[studentIdx];
//   const adminId = adminIds[adminIdx];

//   const studentMessageRes = http.post(
//     'http://localhost:3000/chat/send',
//     JSON.stringify({ receiverId: adminId, message: 'Hello Admin' }),
//     {
//       headers: { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' },
//     }
//   );

//   check(studentMessageRes, {
//     'Student message status is 201': (r) => r.status === 201,
//     'Student message sent successfully': (r) => r.json().message === 'Message sent successfully',
//   });

//   const adminMessageRes = http.post(
//     'http://localhost:3000/chat/send',
//     JSON.stringify({ receiverId: studentId, message: 'Hello Student' }),
//     {
//       headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
//     }
//   );

//   check(adminMessageRes, {
//     'Admin message status is 201': (r) => r.status === 201,
//     'Admin message sent successfully': (r) => r.json().message === 'Message sent successfully',
//   });

//   sleep(1);
// }

//works for 100 users

// import http from 'k6/http';
// import { check, sleep } from 'k6';
// import { SharedArray } from 'k6/data';

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

// // Load data for tokens and user IDs
// const adminTokens = new SharedArray('adminTokens', function () {
//   return JSON.parse(open('./adminTokens.json')); 
// });

// const studentTokens = new SharedArray('studentTokens', function () {
//   return JSON.parse(open('./studentTokens.json'));
// });

// const adminIds = new SharedArray('adminIds', function () {
//   return JSON.parse(open('./adminIds.json')); 
// });

// const studentIds = new SharedArray('studentIds', function () {
//   return JSON.parse(open('./studentIds.json')); 
// });

// export default function () {
//   const studentIdx = Math.floor(Math.random() * studentTokens.length);
//   const adminIdx = Math.floor(Math.random() * adminTokens.length);

//   const studentToken = studentTokens[studentIdx];
//   const adminToken = adminTokens[adminIdx];
//   const studentId = studentIds[studentIdx];
//   const adminId = adminIds[adminIdx];

//   // Student sends a message to Admin (backend ensures it happens in a MongoDB transaction)
//   const studentMessageRes = http.post(
//     'http://localhost:3000/chat/send',
//     JSON.stringify({ receiverId: adminId, message: 'Hello Admin' }),
//     {
//       headers: { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' },
//     }
//   );

//   check(studentMessageRes, {
//     'Student message status is 201': (r) => r.status === 201,
//     'Student message sent successfully': (r) => r.json().message === 'Message sent successfully',
//     'Student message transaction committed': (r) => r.status !== 500,  // Ensure the transaction is successful
//   });

//   // Admin sends a message to Student (also using MongoDB transaction)
//   const adminMessageRes = http.post(
//     'http://localhost:3000/chat/send',
//     JSON.stringify({ receiverId: studentId, message: 'Hello Student' }),
//     {
//       headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
//     }
//   );

//   check(adminMessageRes, {
//     'Admin message status is 201': (r) => r.status === 201,
//     'Admin message sent successfully': (r) => r.json().message === 'Message sent successfully',
//     'Admin message transaction committed': (r) => r.status !== 500,  // Ensure the transaction is successful
//   });

//   sleep(1);  // Simulate realistic pacing
// }

// //for 10000 users

// import http from 'k6/http'; 
// import { check, sleep } from 'k6';
// import { SharedArray } from 'k6/data';

// export const options = {
//   stages: [  
//     { duration: '2m', target: 200 },  // Ramp up to 200 users over 2 minutes  
//     { duration: '3m', target: 500 },  // Ramp up to 500 users over 3 minutes  
//     { duration: '5m', target: 500 },  // Stay at 500 users for 5 minutes  
//     { duration: '1m', target: 0 },    // Ramp down to 0 users
//   ],
//   thresholds: {
//     http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
//     'http_req_failed{scenario:default}': ['rate<0.01'], // Error rate should be less than 1%
//   },
//   ext: {
//     loadimpact: {
//       distribution: {
//         'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 },
//       },
//     },
//   },
//   maxRedirects: 4,
//   timeout: '120s',  // Increase the request timeout to 2 minutes
// };

// const adminTokens = new SharedArray('adminTokens', function () {
//   return JSON.parse(open('./adminTokens.json')); 
// });

// const studentTokens = new SharedArray('studentTokens', function () {
//   return JSON.parse(open('./studentTokens.json'));
// });

// const adminIds = new SharedArray('adminIds', function () {
//   return JSON.parse(open('./adminIds.json')); 
// });

// const studentIds = new SharedArray('studentIds', function () {
//   return JSON.parse(open('./studentIds.json')); 
// });

// const serverPorts = [3000, 3001, 3002, 3003, 3004];
// // Retry function
// function retryRequest(httpMethod, payload, params, maxRetries = 3) {
//   let res;
//   let attempt = 0;
//   let portIndex = 0;
//   while (attempt < maxRetries) {
//     const url = `http://localhost:${serverPorts[portIndex]}/chat/send`;
//     res = httpMethod(url, payload, params);
//     if (res.status === 201) break; // Successful request
//     attempt++;
//     portIndex = (portIndex + 1) % serverPorts.length; 
//     console.error(`Request failed. Attempt ${attempt} of ${maxRetries}. Status: ${res.status}`);
//     sleep(1); // Wait before retrying
//   }
//   return res;
// }

// export default function () {
//   const studentIdx = Math.floor(Math.random() * studentTokens.length);
//   const adminIdx = Math.floor(Math.random() * adminTokens.length);

//   const studentToken = studentTokens[studentIdx];
//   const adminToken = adminTokens[adminIdx];
//   const studentId = studentIds[studentIdx];
//   const adminId = adminIds[studentIdx];

//   // Student sends a message to Admin with retry logic
//   const studentMessageRes = retryRequest(http.post, 
//     JSON.stringify({ receiverId: adminId, message: 'Hello Admin' }), 
//     { headers: { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' } }
//   );

//   check(studentMessageRes, {
//     'Student message status is 201': (r) => r.status === 201,
//     'Student message sent successfully': (r) => r.json().message === 'Message sent successfully',
//   });

//   // Admin sends a message to Student with retry logic
//   const adminMessageRes = retryRequest(http.post, 
//     JSON.stringify({ receiverId: studentId, message: 'Hello Student' }), 
//     { headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' } }
//   );

//   check(adminMessageRes, {
//     'Admin message status is 201': (r) => r.status === 201,
//     'Admin message sent successfully': (r) => r.json().message === 'Message sent successfully',
//   });

//   sleep(5);  // Simulate realistic pacing
// }


// import http from 'k6/http';
// import { check, sleep } from 'k6';
// import { SharedArray } from 'k6/data';

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

// // Load data for tokens and user IDs
// const adminTokens = new SharedArray('adminTokens', function () {
//   return JSON.parse(open('./adminTokens.json')); 
// });

// const studentTokens = new SharedArray('studentTokens', function () {
//   return JSON.parse(open('./studentTokens.json'));
// });

// const adminIds = new SharedArray('adminIds', function () {
//   return JSON.parse(open('./adminIds.json')); 
// });

// const studentIds = new SharedArray('studentIds', function () {
//   return JSON.parse(open('./studentIds.json')); 
// });

// export default function () {
//   const studentIdx = Math.floor(Math.random() * studentTokens.length);
//   const adminIdx = Math.floor(Math.random() * adminTokens.length);

//   const studentToken = studentTokens[studentIdx];
//   const adminToken = adminTokens[adminIdx];
//   const studentId = studentIds[studentIdx];
//   const adminId = adminIds[adminIdx];

//   // Student sends a message to Admin (backend ensures it happens in a MongoDB transaction)
//   const studentMessageRes = http.post(
//     'http://localhost:3000/chat/send',
//     JSON.stringify({ receiverId: adminId, message: 'Hello Admin' }),
//     {
//       headers: { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' },
//     }
//   );

//   check(studentMessageRes, {
//     'Student message status is 201': (r) => r.status === 201,
//     'Student message sent successfully': (r) => r.json().message === 'Message sent successfully',
//     'Student message transaction committed': (r) => r.status !== 500,  // Ensure the transaction is successful
//   });

//   // Admin sends a message to Student (also using MongoDB transaction)
//   const adminMessageRes = http.post(
//     'http://localhost:3000/chat/send',
//     JSON.stringify({ receiverId: studentId, message: 'Hello Student' }),
//     {
//       headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
//     }
//   );

//   check(adminMessageRes, {
//     'Admin message status is 201': (r) => r.status === 201,
//     'Admin message sent successfully': (r) => r.json().message === 'Message sent successfully',
//     'Admin message transaction committed': (r) => r.status !== 500,  // Ensure the transaction is successful
//   });

//   sleep(5);  // Simulate realistic pacing
// }


//500 users 

// import http from 'k6/http';
// import { check, sleep } from 'k6';
// import { SharedArray } from 'k6/data';

// export const options = {
//   stages: [
//     { duration: '1m', target: 100 },  // Ramp up to 100 users over 1 minute
//     { duration: '2m', target: 300 },  // Ramp up to 300 users over 2 minutes
//     { duration: '5m', target: 500 },  // Stay at 500 users for 5 minutes
//     { duration: '2m', target: 300 },  // Ramp down to 300 users over 2 minutes
//     { duration: '1m', target: 100 },  // Ramp down to 100 users over 1 minute
//     { duration: '30s', target: 0 },   // Ramp down to 0 users over 30 seconds
//   ],
//   thresholds: {
//     http_req_duration: ['p(95)<3000'],  // 95% of requests should be below 3s
//     http_req_failed: ['rate<0.01'],     // Error rate should be less than 1%
//   },
// };

// // Load data for tokens and user IDs
// const adminTokens = new SharedArray('adminTokens', function () {
//   return JSON.parse(open('./adminTokens.json')); 
// });

// const studentTokens = new SharedArray('studentTokens', function () {
//   return JSON.parse(open('./studentTokens.json'));
// });

// const adminIds = new SharedArray('adminIds', function () {
//   return JSON.parse(open('./adminIds.json')); 
// });

// const studentIds = new SharedArray('studentIds', function () {
//   return JSON.parse(open('./studentIds.json')); 
// });

// export default function () {
//   const studentIdx = Math.floor(Math.random() * studentTokens.length);
//   const adminIdx = Math.floor(Math.random() * adminTokens.length);

//   const studentToken = studentTokens[studentIdx];
//   const adminToken = adminTokens[adminIdx];
//   const studentId = studentIds[studentIdx];
//   const adminId = adminIds[adminIdx];

//   // Student sends a message to Admin
//   const studentMessageRes = http.post(
//     'http://localhost:3000/chat/send',
//     JSON.stringify({ receiverId: adminId, message: 'Hello Admin' }),
//     {
//       headers: { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' },
//     }
//   );

//   check(studentMessageRes, {
//     'Student message status is 201': (r) => r.status === 201,
//     'Student message sent successfully': (r) => r.json().message === 'Message sent successfully',
//     'Student message transaction committed': (r) => r.status !== 500,
//   });

//   sleep(Math.random() * 3 + 1);

//   // Admin sends a message to Student
//   const adminMessageRes = http.post(
//     'http://localhost:3000/chat/send',
//     JSON.stringify({ receiverId: studentId, message: 'Hello Student' }),
//     {
//       headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
//     }
//   );

//   check(adminMessageRes, {
//     'Admin message status is 201': (r) => r.status === 201,
//     'Admin message sent successfully': (r) => r.json().message === 'Message sent successfully',
//     'Admin message transaction committed': (r) => r.status !== 500,
//   });

//   sleep(Math.random() * 3 + 1);  // Adjusted sleep to 3 seconds to simulate more realistic pacing
// }

//1000 users

// import http from 'k6/http';
// import { check, sleep } from 'k6';
// import { SharedArray } from 'k6/data';

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

// // Load data for tokens and user IDs
// const adminTokens = new SharedArray('adminTokens', function () {
//   return JSON.parse(open('./adminTokens.json')); 
// });

// const studentTokens = new SharedArray('studentTokens', function () {
//   return JSON.parse(open('./studentTokens.json'));
// });

// const adminIds = new SharedArray('adminIds', function () {
//   return JSON.parse(open('./adminIds.json')); 
// });

// const studentIds = new SharedArray('studentIds', function () {
//   return JSON.parse(open('./studentIds.json')); 
// });

// export default function () {
//   const studentIdx = Math.floor(Math.random() * studentTokens.length);
//   const adminIdx = Math.floor(Math.random() * adminTokens.length);

//   const studentToken = studentTokens[studentIdx];
//   const adminToken = adminTokens[adminIdx];
//   const studentId = studentIds[studentIdx];
//   const adminId = adminIds[adminIdx];

//   const retry = (request, maxRetries = 3) => {
//     for (let i = 0; i < maxRetries; i++) {
//       const res = request();
//       if (res.status === 201) return res;  // Stop retry if successful
//       console.log(`Attempt ${i + 1} failed with status ${res.status}. Retrying...`);
//       sleep(1);  // Sleep between retries
//     }
//     return request();  // Final attempt
//   };

//   // Student sends a message to Admin
//   const studentMessageRes = retry(() =>
//     http.post(
//       'http://localhost:3000/chat/send',
//       JSON.stringify({ receiverId: adminId, message: 'Hello Admin' }),
//       {
//         headers: { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' },
//         timeout: '150s'  // Set request timeout
//       }
//     )
//   );

//   check(studentMessageRes, {
//     'Student message status is 201': (r) => r.status === 201,
//     'Student message sent successfully': (r) => r.json().message === 'Message sent successfully',
//     'Student message transaction committed': (r) => r.status !== 500,
//   });

//   sleep(Math.random() * 5 + 2);  // Sleep between 2 to 7 seconds

//   // Admin sends a message to Student
//   const adminMessageRes = retry(() =>
//     http.post(
//       'http://localhost:3000/chat/send',
//       JSON.stringify({ receiverId: studentId, message: 'Hello Student' }),
//       {
//         headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
//         timeout: '150s'  // Set request timeout
//       }
//     )
//   );

//   check(adminMessageRes, {
//     'Admin message status is 201': (r) => r.status === 201,
//     'Admin message sent successfully': (r) => r.json().message === 'Message sent successfully',
//     'Admin message transaction committed': (r) => r.status !== 500,
//   });

//   sleep(Math.random() * 5 + 2);  // Sleep between 2 to 7 seconds
// }

//fetcching inlcuding for 1000 users
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

export const options = {
  stages: [
    { duration: '1m', target: 200 },
    { duration: '2m', target: 500 },
    { duration: '5m', target: 1000 },
    { duration: '2m', target: 500 },
    { duration: '1m', target: 200 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests should be below 3s
    http_req_failed: ['rate<0.01'],    // Error rate should be less than 1%
  },
};

const studentTokens = new SharedArray('studentTokens', () => JSON.parse(open('./studentTokens.json')));
const adminTokens = new SharedArray('adminTokens', () => JSON.parse(open('./adminTokens.json')));
const studentIds = new SharedArray('studentIds', () => JSON.parse(open('./studentIds.json')));
const adminIds = new SharedArray('adminIds', () => JSON.parse(open('./adminIds.json')));

export default function () {
  const studentIdx = Math.floor(Math.random() * studentTokens.length);
  const adminIdx = Math.floor(Math.random() * adminTokens.length);

  const studentToken = studentTokens[studentIdx];
  const adminToken = adminTokens[adminIdx];
  const studentId = studentIds[studentIdx];
  const adminId = adminIds[adminIdx];

  // Student fetching messages
  const studentMessagesRes = http.get(
    `http://localhost:3000/chat/${adminId}`,
    { headers: { Authorization: `Bearer ${studentToken}` } }
  );

  check(studentMessagesRes, {
    'Student fetch messages status is 200': (r) => r.status === 200,
    'Student fetched messages successfully': (r) => r.json().message === 'Messages:',
    'Student fetch messages not failing': (r) => r.status !== 500,
  });

  sleep(Math.random() * 5 + 2);  // Sleep between 2 to 7 seconds

  // Admin fetching messages
  const adminMessagesRes = http.get(
    `http://localhost:3000/chat/${studentId}`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );

  check(adminMessagesRes, {
    'Admin fetch messages status is 200': (r) => r.status === 200,
    'Admin fetched messages successfully': (r) => r.json().message === 'Messages:',
    'Admin fetch messages not failing': (r) => r.status !== 500,
  });

  sleep(Math.random() * 5 + 2);  // Sleep between 2 to 7 seconds
}
