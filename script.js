class ChatApplication {
  constructor() {
    this.currentUser = null;
    this.currentRoom = null;
    this.rooms = new Map();
    this.users = new Set();
    this.messageHistory = new Map();
    this.isConnected = false;
    this.formatting = {
      bold: false,
      italic: false,
    };

    this.initializeEventListeners();
    this.simulateWebSocket();
    this.loadDefaultRooms();
  }

  initializeEventListeners() {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        this.handleLogout();
      });
    }

    const messageForm = document.getElementById("messageForm");
    if (messageForm) {
      messageForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.sendMessage();
      });
    }

    const createRoomBtn = document.getElementById("createRoomBtn");
    if (createRoomBtn) {
      createRoomBtn.addEventListener("click", () => {
        this.createRoom();
      });
    }

    const newRoomInput = document.getElementById("newRoomInput");
    if (newRoomInput) {
      newRoomInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.createRoom();
        }
      });
    }

    const mobileToggle = document.getElementById("mobileToggle");
    if (mobileToggle) {
      mobileToggle.addEventListener("click", () => {
        const sidebar = document.getElementById("sidebar");
        if (sidebar) {
          sidebar.classList.toggle("open");
        }
      });
    }

    document.querySelectorAll(".s-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const format = btn.dataset.format;
        this.toggleFormatting(format);
        btn.classList.toggle("active");
      });
    });

    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        this.exportChatHistory();
      });
    }

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.handleSearch(e.target.value);
      });
    }

    setInterval(() => {
      this.checkConnection();
    }, 10000);

    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("copy-btn")) {
        this.copyMessage(e.target.dataset.messageId);
      }
      if (e.target.classList.contains("reply-btn")) {
        this.replyToMessage(e.target.dataset.messageId);
      }
    });
    this.addConnectionStatus();

    const messageInput = document.getElementById("messageInput");
    if (messageInput) {
      messageInput.addEventListener("input", () => {
        this.autoResizeInput();
      });
    }
  }

  simulateWebSocket() {
    setTimeout(() => {
      this.isConnected = true;
      this.showNotification("Connected to chat server", "success");
    }, 1000);

    setInterval(() => {
      if (this.currentRoom && this.rooms.has(this.currentRoom)) {
        this.simulateUserActivity();
      }
    }, 30000);
  }

  loadDefaultRooms() {
    const defaultRooms = [
      { name: "General", users: ["Karan", "Max", "Smith"] },
      { name: "Technology", users: ["TechGuru", "CodeMaster"] },
      { name: "Random", users: ["User1", "User2", "User3"] },
    ];

    defaultRooms.forEach((room) => {
      this.rooms.set(room.name, {
        name: room.name,
        users: new Set(room.users),
        messages: [],
      });
    });

    this.updateRoomList();
  }

  handleLogin() {
    const username = document.getElementById("usernameInput").value.trim();
    const errorDiv = document.getElementById("loginError");

    if (!username) {
      errorDiv.textContent = "Username is required";
      return;
    }

    if (username.length < 3) {
      errorDiv.textContent = "Username must be at least 3 characters long";
      return;
    }

    if (this.users.has(username)) {
      errorDiv.textContent = "Username is already taken";
      return;
    }

    this.currentUser = username;
    this.users.add(username);

    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("chatInterface").style.display = "flex";
    document.getElementById(
      "currentUser"
    ).textContent = `Welcome, ${username}!`;

    this.showNotification(`Welcome to the chat, ${username}!`, "success");
    this.updateRoomList();
  }

  handleLogout() {
    if (this.currentRoom) {
      this.leaveRoom();
    }

    this.users.delete(this.currentUser);
    this.currentUser = null;
    this.currentRoom = null;

    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("chatInterface").style.display = "none";
    document.getElementById("usernameInput").value = "";
    document.getElementById("loginError").textContent = "";

    this.showNotification("Logged out successfully", "success");
  }

  createRoom() {
    const roomName = document.getElementById("newRoomInput").value.trim();

    if (!roomName) {
      this.showNotification("Room name is required", "error");
      return;
    }

    if (this.rooms.has(roomName)) {
      this.showNotification("Room already exists", "error");
      return;
    }

    this.rooms.set(roomName, {
      name: roomName,
      users: new Set(),
      messages: [],
    });

    document.getElementById("newRoomInput").value = "";
    this.updateRoomList();
    this.showNotification(`Room "${roomName}" created successfully`, "success");
  }

  updateRoomList() {
    const roomList = document.getElementById("roomList");
    roomList.innerHTML = "";

    this.rooms.forEach((room, roomName) => {
      const roomItem = document.createElement("li");
      roomItem.className = "room-item";
      roomItem.innerHTML = `
                        <span>${roomName}</span>
                        <span class="user-count">${room.users.size}</span>
                    `;

      if (this.currentRoom === roomName) {
        roomItem.classList.add("active");
      }

      roomItem.addEventListener("click", () => {
        this.joinRoom(roomName);
      });

      roomList.appendChild(roomItem);
    });
  }

  joinRoom(roomName) {
    if (this.currentRoom === roomName) return;

    if (this.currentRoom) {
      this.leaveRoom();
    }

    this.currentRoom = roomName;
    const room = this.rooms.get(roomName);
    room.users.add(this.currentUser);

    document.getElementById("currentRoomName").textContent = roomName;
    document.getElementById("messageInput").disabled = false;
    document.getElementById("sendBtn").disabled = false;

    this.loadMessages(roomName);
    this.updateRoomList();
    this.updateOnlineUsers();
    this.scrollToBottom();
    this.addSystemMessage(`${this.currentUser} joined the room`);

    document.getElementById("sidebar").classList.remove("open");
  }

  leaveRoom() {
    if (!this.currentRoom) return;

    const room = this.rooms.get(this.currentRoom);
    room.users.delete(this.currentUser);

    this.addSystemMessage(`${this.currentUser} left the room`);
    this.currentRoom = null;
  }

  loadMessages(roomName) {
    const room = this.rooms.get(roomName);
    const container = document.getElementById("messagesContainer");
    container.innerHTML = "";

    room.messages.forEach((message) => {
      this.displayMessage(message);
    });

    if (room.messages.length === 0) {
      const welcomeMessage = document.createElement("div");
      welcomeMessage.className = "message system";
      welcomeMessage.innerHTML = `
                        <div class="message-content">Welcome to ${roomName}! Start the conversation.</div>
                    `;
      container.appendChild(welcomeMessage);
    }
  }

  sendMessage() {
    const input = document.getElementById("messageInput");
    const content = input.value.trim();

    if (!content || !this.currentRoom) return;

    if (!this.validateMessage(content)) return;

    const sanitizedContent = this.sanitizeInput(content);
    const message = {
      id: Date.now(),
      author: this.currentUser,
      content: this.formatMessage(sanitizedContent),
      timestamp: new Date().toISOString(),
      room: this.currentRoom,
    };

    const room = this.rooms.get(this.currentRoom);
    room.messages.push(message);

    this.displayMessage(message);
    input.value = "";
    this.scrollToBottom();
    this.resetFormatting();

    if (Math.random() > 0.7) {
      setTimeout(() => this.showTypingIndicator(), 500);
    }
    setTimeout(() => {
      this.simulateMessageResponse(message);
    }, 1000 + Math.random() * 3000);
  }

  formatMessage(content) {
    let formatted = content;
    if (this.formatting.bold) {
      formatted = `**${formatted}**`;
    }
    if (this.formatting.italic) {
      formatted = `*${formatted}*`;
    }

    formatted = formatted.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank">$1</a>'
    );

    formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");

    return formatted;
  }

  toggleFormatting(format) {
    this.formatting[format] = !this.formatting[format];
  }

  resetFormatting() {
    this.formatting = { bold: false, italic: false };
    document.querySelectorAll(".s-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
  }

  displayMessage(message) {
    const container = document.getElementById("messagesContainer");
    const messageDiv = document.createElement("div");
    messageDiv.className = "message";
    messageDiv.style.position = "relative";
    messageDiv.dataset.messageId = message.id;

    if (message.author === this.currentUser) {
      messageDiv.classList.add("own");
    }

    const time = new Date(message.timestamp).toLocaleTimeString();
    messageDiv.innerHTML = `
                    <div class="message-header">
                        <span class="message-author">${message.author}</span>
                        <span class="message-time">${time}</span>
                    </div>
                    <div class="message-content">${message.content}</div>
                    <div class="message-actions">
                        <button class="action-btn copy-btn" data-message-id="${message.id}">Copy</button>
                        <button class="action-btn reply-btn" data-message-id="${message.id}">Reply</button>
                    </div>
                `;

    container.appendChild(messageDiv);
    this.scrollToBottom();
  }

  handleSearch(query) {
    if (!query.trim()) {
      this.loadMessages(this.currentRoom);
      return;
    }

    const results = this.searchMessages(query);
    const container = document.getElementById("messagesContainer");
    container.innerHTML = "";

    if (results.length === 0) {
      const noResults = document.createElement("div");
      noResults.className = "message system";
      noResults.innerHTML = `<div class="message-content">No messages found for "${query}"</div>`;
      container.appendChild(noResults);
      return;
    }

    results.forEach((message) => {
      this.displayMessage(message);
    });
  }

  copyMessage(messageId) {
    const messageDiv = document.querySelector(
      `[data-message-id="${messageId}"]`
    );
    const content = messageDiv.querySelector(".message-content").textContent;

    navigator.clipboard
      .writeText(content)
      .then(() => {
        this.showNotification("Message copied to clipboard", "success");
      })
      .catch(() => {
        this.showNotification("Failed to copy message", "error");
      });
  }

  replyToMessage(messageId) {
    const messageDiv = document.querySelector(
      `[data-message-id="${messageId}"]`
    );
    const author = messageDiv.querySelector(".message-author").textContent;
    const input = document.getElementById("messageInput");

    input.value = `@${author} `;
    input.focus();
    this.showNotification(`Replying to ${author}`, "success");
  }


  addConnectionStatus() {
    const statusDiv = document.createElement("div");
    statusDiv.className = "connection-status";
    statusDiv.id = "connectionStatus";
    statusDiv.textContent = "Connected";
    document.body.appendChild(statusDiv);
  }

  updateConnectionStatus(connected) {
    const statusDiv = document.getElementById("connectionStatus");
    if (statusDiv) {
      statusDiv.textContent = connected ? "Connected" : "Disconnected";
      statusDiv.className = connected
        ? "connection-status"
        : "connection-status disconnected";
    }
  }

  addSystemMessage(content) {
    const message = {
      id: Date.now(),
      author: "System",
      content: content,
      timestamp: new Date().toISOString(),
      room: this.currentRoom,
    };

    const room = this.rooms.get(this.currentRoom);
    room.messages.push(message);

    const container = document.getElementById("messagesContainer");
    const messageDiv = document.createElement("div");
    messageDiv.className = "message system";
    messageDiv.innerHTML = `<div class="message-content">${content}</div>`;

    container.appendChild(messageDiv);
    this.scrollToBottom();
  }

  simulateMessageResponse(originalMessage) {
    if (!this.currentRoom || this.currentRoom !== originalMessage.room) return;

    const responses = [
      "That's interesting!",
      "I agree with that.",
      "Thanks for sharing!",
      "Good point!",
      "Absolutely!",
      "I see what you mean.",
      "That makes sense.",
    ];

    const botUsers = ["Karan", "Max", "Smith", "TechGuru", "CodeMaster"];
    const randomUser = botUsers[Math.floor(Math.random() * botUsers.length)];
    const randomResponse =
      responses[Math.floor(Math.random() * responses.length)];

    if (Math.random() > 0.7) {
      const responseMessage = {
        id: Date.now(),
        author: randomUser,
        content: randomResponse,
        timestamp: new Date().toISOString(),
        room: this.currentRoom,
      };

      const room = this.rooms.get(this.currentRoom);
      room.messages.push(responseMessage);
      this.displayMessage(responseMessage);

      this.showNotification(`New message from ${randomUser}`, "success");
    }
  }

  simulateUserActivity() {
    if (Math.random() > 0.8) {
      const room = this.rooms.get(this.currentRoom);
      const allUsers = [
        "Karan",
        "Max",
        "Smith",
        "TechGuru",
        "CodeMaster",
        "User1",
        "User2",
      ];
      const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];

      if (room.users.has(randomUser)) {
        room.users.delete(randomUser);
        this.addSystemMessage(`${randomUser} left the room`);
      } else {
        room.users.add(randomUser);
        this.addSystemMessage(`${randomUser} joined the room`);
      }

      this.updateRoomList();
      this.updateOnlineUsers();
    }
  }

  validateMessage(content) {
    if (!content || content.trim().length === 0) {
      this.showNotification("Message cannot be empty", "error");
      return false;
    }

    if (content.length > 500) {
      this.showNotification("Message too long (max 500 characters)", "error");
      return false;
    }

    if (/(.)\1{10,}/.test(content)) {
      this.showNotification(
        "Message contains too many repeated characters",
        "error"
      );
      return false;
    }

    return true;
  }

  sanitizeInput(input) {
    return input
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }

  showTypingIndicator() {
    if (!this.currentRoom) return;

    const container = document.getElementById("messagesContainer");
    const typingDiv = document.createElement("div");
    typingDiv.className = "message typing-indicator";
    typingDiv.id = "typingIndicator";
    typingDiv.innerHTML = `
                    <div class="message-content">
                        <span class="typing-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </span>
                        Someone is typing...
                    </div>
                `;

    container.appendChild(typingDiv);
    this.scrollToBottom();

    setTimeout(() => {
      const indicator = document.getElementById("typingIndicator");
      if (indicator) {
        indicator.remove();
      }
    }, 3000);
  }

  checkConnection() {
    if (!this.isConnected) {
      this.showNotification("Connection lost. Trying to reconnect...", "error");
      this.updateConnectionStatus(false);
      this.attemptReconnection();
    }
  }

  attemptReconnection() {
    let attempts = 0;
    const maxAttempts = 3;

    const reconnectInterval = setInterval(() => {
      attempts++;

      if (attempts >= maxAttempts) {
        clearInterval(reconnectInterval);
        this.showNotification(
          "Failed to reconnect. Please refresh the page.",
          "error"
        );
        return;
      }

      setTimeout(() => {
        this.isConnected = true;
        this.updateConnectionStatus(true);
        this.showNotification("Reconnected successfully!", "success");
        clearInterval(reconnectInterval);
      }, 2000);
    }, 3000);
  }

  searchMessages(query) {
    if (!this.currentRoom || !query.trim()) return [];

    const room = this.rooms.get(this.currentRoom);
    return room.messages.filter(
      (message) =>
        message.content.toLowerCase().includes(query.toLowerCase()) ||
        message.author.toLowerCase().includes(query.toLowerCase())
    );
  }

  exportChatHistory() {
    if (!this.currentRoom) {
      this.showNotification("No room selected", "error");
      return;
    }

    const room = this.rooms.get(this.currentRoom);
    const chatData = {
      room: this.currentRoom,
      exportDate: new Date().toISOString(),
      messages: room.messages.map((msg) => ({
        author: msg.author,
        content: msg.content,
        timestamp: msg.timestamp,
      })),
    };

    const dataStr = JSON.stringify(chatData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `chat-history-${this.currentRoom}-${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();

    URL.revokeObjectURL(url);
    this.showNotification("Chat history exported successfully", "success");
  }

  updateOnlineUsers() {
    if (!this.currentRoom) return;

    const room = this.rooms.get(this.currentRoom);
    const userList = Array.from(room.users).join(", ");
    document.getElementById("onlineUsers").textContent = `Online: ${
      userList || "No users online"
    }`;
  }

  scrollToBottom() {
    const container = document.getElementById("messagesContainer");
    container.scrollTop = container.scrollHeight;
  }

  autoResizeInput() {
    const input = document.getElementById("messageInput");
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
  }

  showNotification(message, type = "success") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

const chatApp = new ChatApplication();
