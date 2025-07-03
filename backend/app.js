// app.js
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const { connectRabbitMQ } = require('./rabbitmq/publisher');
const questionRoutes = require('./routes/questions');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/ask', questionRoutes);

// Diagnostic Catch-all Route
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The route ${req.method} ${req.path} does not exist on this server.`,
    availableRoutes: ['POST /ask']
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const clients = new Map();

function setupWebSocketServer() {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      ws.close(1008, 'User ID is required');
      return;
    }

    clients.set(userId, ws);
    console.log(`[WebSocket] Client connected: ${userId}`);

    ws.on('close', () => {
      clients.delete(userId);
      console.log(`[WebSocket] Client disconnected: ${userId}`);
    });

    ws.on('error', (error) => {
      console.error(`[WebSocket] Error for ${userId}:`, error);
    });
  });
}

async function startReplyConsumer() {
  try {
    const channel = await connectRabbitMQ();
    const replyQueue = 'bot-replies';
    await channel.assertQueue(replyQueue, { durable: true });
    await channel.bindQueue(replyQueue, 'chatbot-exchange', 'reply');

    console.log('[RabbitMQ] Listening for bot replies...');

    channel.consume(replyQueue, (msg) => {
      if (msg !== null) {
        try {
          const reply = JSON.parse(msg.content.toString());
          const { userId, questionId, payload } = reply;

          if (clients.has(userId)) {
            const clientWs = clients.get(userId);
            clientWs.send(JSON.stringify({ questionId, payload }));
            console.log(`[WebSocket] Relayed reply for ${userId} (QID: ${questionId})`);
          } else {
            console.warn(`[WebSocket] No client found for userId: ${userId}. Message will be dropped.`);
          }
          channel.ack(msg);
        } catch (e) {
          console.error('[RabbitMQ] Error processing reply message:', e);
          channel.nack(msg, false, false); // Reject message without requeueing
        }
      }
    });
  } catch (error) {
    console.error('[RabbitMQ] Failed to start reply consumer:', error);
    // Exit if we can't connect to RabbitMQ, as the service is useless without it.
    process.exit(1);
  }
}

function startServer() {
  setupWebSocketServer();
  
  server.listen(PORT, () => {
    console.log(`[Server] Backend running on http://localhost:${PORT}`);
    startReplyConsumer();
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ FATAL: Port ${PORT} is already in use. Please close the other process or change the port.`);
      process.exit(1);
    } else {
      console.error('❌ Server error:', error);
    }
  });
}

startServer();
