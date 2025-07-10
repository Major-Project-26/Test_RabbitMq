// app.js
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const { connectRabbitMQ } = require('./rabbitmq/publisher');
const { EXCHANGE_CHATBOT, QUEUE_REPLIES, ROUTING_KEY_REPLY, EXCHANGE_COMMUNITY, EXCHANGE_TYPE_FANOUT } = require('../shared/constants');
const questionRoutes = require('./routes/questions');
const broadcastRoutes = require('./routes/broadcast');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const clients = new Map();
const communityClients = new Map();

app.use('/ask', questionRoutes);
app.use('/broadcast', broadcastRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The route ${req.method} ${req.path} does not exist on this server.`,
    availableRoutes: ['POST /ask', 'POST /broadcast']
  });
});

function handleClientConnection(ws, userId, clientMap, clientType) {
  clientMap.set(userId, ws);
  console.log(`[WebSocket] ${clientType} client connected: ${userId}`);

  ws.on('close', () => {
    clientMap.delete(userId);
    console.log(`[WebSocket] ${clientType} client disconnected: ${userId}`);
  });
}

function setupWebSocketServer() {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');
    const type = url.searchParams.get('type') || 'chat';

    if (!userId) {
      ws.close(1008, 'User ID is required');
      return;
    }

    if (type === 'community') {
      handleClientConnection(ws, userId, communityClients, 'Community');
    } else {
      handleClientConnection(ws, userId, clients, 'Chat');
    }

    ws.on('error', (error) => {
      console.error(`[WebSocket] Error for ${userId}:`, error);
    });
  });
}

async function startReplyConsumer() {
  try {
    const channel = await connectRabbitMQ();
    const replyQueue = QUEUE_REPLIES;
    await channel.assertQueue(replyQueue, { durable: true });
    await channel.bindQueue(replyQueue, EXCHANGE_CHATBOT, ROUTING_KEY_REPLY);

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
          channel.nack(msg, false, false);
        }
      }
    });
  } catch (error) {
    console.error('[RabbitMQ] Failed to start reply consumer:', error);
    process.exit(1);
  }
}

async function startBroadcastConsumer() {
  try {
    const channel = await connectRabbitMQ();
    
    await channel.assertExchange(EXCHANGE_COMMUNITY, EXCHANGE_TYPE_FANOUT, { durable: false });
    
    const { queue } = await channel.assertQueue('', { exclusive: true });
    await channel.bindQueue(queue, EXCHANGE_COMMUNITY, '');

    console.log('[RabbitMQ] Listening for broadcast messages...');

    channel.consume(queue, (msg) => {
      if (msg !== null) {
        try {
          const broadcastMessage = JSON.parse(msg.content.toString());
          
          // Send to all connected community clients
          communityClients.forEach((ws, userId) => {
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify(broadcastMessage));
              console.log(`[WebSocket] Sent broadcast to ${userId}`);
            }
          });
          
          channel.ack(msg);
        } catch (e) {
          console.error('[RabbitMQ] Error processing broadcast message:', e);
          channel.nack(msg, false, false);
        }
      }
    });
  } catch (error) {
    console.error('[RabbitMQ] Failed to start broadcast consumer:', error);
  }
}

function startServer() {
  setupWebSocketServer();
  
  server.listen(PORT, () => {
    console.log(`[Server] Backend running on http://localhost:${PORT}`);
    startReplyConsumer();
    startBroadcastConsumer();
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

