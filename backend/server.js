# Chatbot with RabbitMQ, Gemini, and Next.js

This document explains the high-level architecture and provides instructions on how to run the project.

## High-Level Flow

The application is composed of three main services that communicate via a RabbitMQ message broker. This decoupled architecture allows for scalability and resilience.

1.  **User Sends a Question:** The user types a message in the **Frontend** (Next.js) and clicks send.
2.  **HTTP Request to Backend:** The frontend sends an HTTP POST request to the **Backend** (Express.js) at the `/ask` endpoint.
3.  **Message Published to RabbitMQ:** The backend receives the question, generates a unique `questionId` (a UUID/GUID), and publishes it as a message to the `chatbot-exchange` in RabbitMQ with the routing key `question`.
4.  **Agent Consumes Message:** The `direct` exchange routes the message to the `user-questions` queue. The **Chatbot Agent** is subscribed to this queue, so it picks up the message.
5.  **AI Processing:** The agent sends the question to the **Google Gemini API** to generate a response.
6.  **Reply Published to RabbitMQ:** The agent publishes the AI's answer back to the same `chatbot-exchange`, but this time with the routing key `reply`.
7.  **Backend Consumes Reply:** The exchange routes the reply to the `bot-replies` queue. The **Backend** is subscribed to this queue.
8.  **WebSocket Push to Frontend:** The backend receives the reply, identifies the correct user via their `userId`, and pushes the message to the user's **Frontend** through an active WebSocket connection. The user sees the bot's response in real-time.

## RabbitMQ Concepts Used

-   **Exchange:** `chatbot-exchange`
    -   **Type:** `direct`
    -   A **direct exchange** delivers messages to queues based on a **routing key**. The routing key of the message must exactly match the binding key of the queue.

-   **Queues:**
    -   `user-questions`: A durable queue that holds questions from users. It is bound to the exchange with the key `question`.
    -   `bot-replies`: A durable queue that holds answers from the AI. It is bound to the exchange with the key `reply`.

-   **Routing Keys:**
    -   `question`: Used by the backend to send messages to the `user-questions` queue.
    -   `reply`: Used by the chatbot agent to send messages to the `bot-replies` queue.

## How to Run

You will need **4 separate terminal windows** to run the entire system.

### Prerequisites

1.  **Node.js:** v18 or later.
2.  **Docker & Docker Compose:** For running RabbitMQ.
3.  **Gemini API Key:** Create a `.env` file at `d:/chatbot/Test_RabbitMq/Chatbot/.env` with your key:

    ```
    GEMINI_API_KEY=your_google_gemini_api_key_here
    ```

### Step 1: Start RabbitMQ (Terminal 1)

In the project root (`d:/chatbot/Test_RabbitMq/`), run:

```bash
docker-compose up
```

This uses the `docker-compose.yml` file to start a RabbitMQ container.

-   **Application Port:** `5672`
-   **Management UI:** [http://localhost:15672](http://localhost:15672) (user: `guest`, pass: `guest`)

### Step 2: Start the Backend API (Terminal 2)

```bash
# Navigate to the backend directory
cd d:\chatbot\Test_RabbitMq\backend

# Install dependencies
npm install

# Start the server
npm start
```

### Step 3: Start the Chatbot Agent (Terminal 3)

```bash
# Navigate to the Chatbot agent directory
cd d:\chatbot\Test_RabbitMq\Chatbot

# Install dependencies
npm install

# Start the agent
npm start
```

### Step 4: Start the Frontend (Terminal 4)

```bash
# Navigate to the frontend directory
cd d:\chatbot\Test_RabbitMq\frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Step 5: Use the Chatbot

Open your browser and navigate to **[http://localhost:3000/chat](http://localhost:3000/chat)**. You can now chat with the AI.

## Backend Code Changes

The backend has been updated to handle community broadcasting with a new fanout exchange. Below are the relevant code sections from `server.js`.

### New Dependencies

Ensure you have the following dependencies in your `package.json`:

```json
"dependencies": {
  "amqplib": "^0.8.0",
  "cors": "^2.8.5",
  "dotenv": "^10.0.0",
  "express": "^4.17.1",
  "http": "0.0.1-security",
  "socket.io": "^4.0.0",
  "uuid": "^8.3.2"
}
```

### Updated `server.js`

```javascript
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

let connection;
let channel;
const userSockets = new Map(); // userId -> socket
const userQueues = new Map();  // userId -> queueName for communities

async function connectRabbitMQ() {
  try {
    connection = await amqp.connect('amqp://localhost');
    channel = await connection.createChannel();
    
    // Existing chatbot setup
    await channel.assertExchange('chatbot-exchange', 'direct', { durable: true });
    await channel.assertQueue('user-questions', { durable: true });
    await channel.assertQueue('bot-replies', { durable: true });
    await channel.bindQueue('user-questions', 'chatbot-exchange', 'question');
    await channel.bindQueue('bot-replies', 'chatbot-exchange', 'reply');

    // New communities fanout exchange
    await channel.assertExchange('communities-exchange', 'fanout', { durable: false });

    // Listen for bot replies (existing functionality)
    channel.consume('bot-replies', (msg) => {
      if (msg) {
        const reply = JSON.parse(msg.content.toString());
        const socket = userSockets.get(reply.userId);
        
        if (socket) {
          socket.emit('bot-reply', reply);
        }
        
        channel.ack(msg);
      }
    });

    console.log('Connected to RabbitMQ');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
  }
}

// Existing chatbot endpoint
app.post('/ask', async (req, res) => {
  // ...existing code...
});

// New broadcast endpoint for communities
app.post('/broadcast', async (req, res) => {
  try {
    const { message, adminId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const broadcastMessage = {
      id: uuidv4(),
      message,
      adminId: adminId || 'admin',
      timestamp: new Date().toISOString(),
      type: 'broadcast'
    };

    // Publish to fanout exchange - will reach all bound queues
    await channel.publish(
      'communities-exchange',
      '', // routing key ignored in fanout
      Buffer.from(JSON.stringify(broadcastMessage))
    );

    res.json({ success: true, messageId: broadcastMessage.id });
  } catch (error) {
    console.error('Error broadcasting message:', error);
    res.status(500).json({ error: 'Failed to broadcast message' });
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('register-user', async (userId) => {
    userSockets.set(userId, socket);
    
    // Create a unique queue for this user for communities
    const queueName = `community-user-${userId}`;
    try {
      await channel.assertQueue(queueName, { 
        exclusive: false,
        autoDelete: true // Queue will be deleted when connection closes
      });
      await channel.bindQueue(queueName, 'communities-exchange', '');
      
      userQueues.set(userId, queueName);
      
      // Start consuming community messages for this user
      channel.consume(queueName, (msg) => {
        if (msg) {
          const broadcastMessage = JSON.parse(msg.content.toString());
          socket.emit('community-message', broadcastMessage);
          channel.ack(msg);
        }
      }, { noAck: false });
      
      console.log(`User ${userId} registered with queue ${queueName}`);
    } catch (error) {
      console.error('Error setting up user queue:', error);
    }
  });

  socket.on('disconnect', async () => {
    // Find and remove user from maps
    for (const [userId, userSocket] of userSockets.entries()) {
      if (userSocket === socket) {
        userSockets.delete(userId);
        
        // Clean up user's community queue
        const queueName = userQueues.get(userId);
        if (queueName) {
          try {
            await channel.deleteQueue(queueName);
            userQueues.delete(userId);
            console.log(`Cleaned up queue ${queueName} for user ${userId}`);
          } catch (error) {
            console.error('Error cleaning up queue:', error);
          }
        }
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

connectRabbitMQ();
server.listen(5000, () => {
  console.log('Backend server running on http://localhost:5000');
});
```

### New Endpoints

- **POST** `/broadcast`: For broadcasting messages to all users in a community.

  **Request Body:**
  ```json
  {
    "message": "Your message here",
    "adminId": "optional_admin_id"
  }
  ```

  **Response:**
  ```json
  {
    "success": true,
    "messageId": "generated_message_id"
  }
  ```

### WebSocket Events

- `register-user`: To register a user and create a unique queue for community messages.
- `community-message`: Sent to the user when a broadcast message is received for their community.

### Notes

- The fanout exchange `communities-exchange` is used for broadcasting messages to all users in a community. This exchange type does not use routing keys; instead, it sends messages to all bound queues.
- Each user has a unique queue (e.g., `community-user-123`) for receiving community messages. These queues are automatically deleted when the connection closes.
- Error handling and input validation are essential, especially for production code. Ensure to handle possible errors from RabbitMQ and validate incoming data.