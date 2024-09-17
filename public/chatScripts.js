var counter = 0;
let selectedUser = null;
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/index.html";
}

function isTokenExpired(token) {
  const payload = JSON.parse(atob(token.split(".")[1]));
  return payload.exp * 1000 < Date.now();
}

if (isTokenExpired(token)) {
  localStorage.removeItem("token");
  alert("Session expired. Please log in again.");
  window.location.href = "/index.html";
}

const socket = io({
  auth: {
    token: token,
    serverOffset: 0,
  },
  ackTimeout: 10000,
  retries: 3,
});


const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const toggleBtn = document.getElementById("toggle-btn");
const userSelect = document.getElementById("userSelect");
const selectedInfo = document.getElementById("selected-info");

socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
});

form.addEventListener("submit", function (e) {
  e.preventDefault();
  const payload = JSON.parse(atob(token.split(".")[1]));
  console.log("Payload:", payload);
  const userId = payload.userID;
  if (input.value.trim() !== "" && selectedUser) {
    console.log("Sending message after pressing Submit:", input.value);
    fetch("/chat/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        receiverId: selectedUser,
        message: input.value,
        senderId: userId,
      }),
    })
      .then((response) => {
        if (response.status === 404) {
          throw new Error("Endpoint not found. Check the server route configuration.");
        } else if (response.status === 403) {
          throw new Error("You can only send messages to admins.");
        } else if (!response.ok) {
          throw new Error("Network response was not ok " + response.statusText);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Message sent:", data);
        socket.emit("chat message", {
          message: input.value,
          senderId: userId,
          receiverId: selectedUser,
        });
        input.value = "";
      })
      .catch((error) => {
        console.error("Error sending message:", error);
        alert("Error sending message: " + error.message);
      });
  } else {
    alert("Please select a user to send a message.");
  }
});

toggleBtn.addEventListener("click", function () {
  if (toggleBtn.innerHTML === "Connect") {
    window.location.reload();
  } else if (toggleBtn.innerHTML === "Disconnect") {
    socket.disconnect();
    toggleBtn.innerHTML = "Connect";
  }
});

function handleUserSelection(userId, userName) {
  selectedUser = userId;
  selectedInfo.textContent = `User Selected: ${userName}`;
  console.log(`User Selected: ${userId}`);
  updateMessageList();
}

userSelect.addEventListener("change", function () {
  const selectedUserId = userSelect.value;
  const selectedUserName = userSelect.options[userSelect.selectedIndex].text;

  if (selectedUserId) {
    handleUserSelection(selectedUserId, selectedUserName);
    socket.emit("joinRoom", selectedUserId);
    updateMessageList();
  }
});

function updateMessageList() {
  messages.innerHTML = "";

  if (selectedUser) {
    fetch(`/chat/${selectedUser}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok " + response.statusText);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Fetched user messages:", data);
        if (data.messages && Array.isArray(data.messages)) {
          if (data.messages.length === 0) {
            console.log("No messages to display as data.messages is empty");
            messages.innerHTML = "<li>No messages to display</li>";
          } else {
            data.messages.forEach(({ message, senderId }) => {
              const item = document.createElement("li");
              item.textContent = `${senderId}: ${message}`;
              messages.appendChild(item);
            });
            window.scrollTo(0, document.body.scrollHeight);
          }
        } else {
          console.log(
            "No messages to display as data.messages is null or not an array"
          );
          messages.innerHTML = "<li>No messages to display</li>";
        }
      })
      .catch((error) => {
        console.error("Error fetching messages:", error);
      });
  } else {
    console.log("No user selected");
  }
}

// Handle incoming chat messages
socket.on("chat message", (data) => {
  console.log("Data received:", data);
  const { message, senderId, receiverId } = data;

  // Show message if it's for the selected user or if it's from the selected user
  if (selectedUser === receiverId || selectedUser === senderId) {
    const item = document.createElement("li");
    item.textContent = `${senderId}: ${message}`;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
  } else {
    console.log("Message received but not displayed:", message);
  }
});

// Handle socket disconnection
socket.on("disconnect", () => {
  console.log("User disconnected");
});

// Fetch all users
fetch("/auth/getAllUsers", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
})
  .then((response) => {
    if (!response.ok) {
      return response.text().then((text) => {
        console.error("Error fetching users. Response text:", text);
        throw new Error("Network response was not ok " + response.statusText);
      });
    }
    return response.json();
  })
  .then((data) => {
    console.log("Fetched data:", data);
    if (Array.isArray(data.users)) {
      data.users.forEach((user) => {
        const option = document.createElement("option");
        option.value = user._id;
        option.textContent = user.userName;
        userSelect.appendChild(option);
      });
    } else {
      console.error("Expected an array but received:", data.users);
    }
  })
  .catch((error) => {
    console.error("Error fetching users:", error);
  });
