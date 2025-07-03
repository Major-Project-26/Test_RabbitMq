// rabbitmq/publisher.js
const amqp = require('amqplib');

let channel;
let connection;

async function connectRabbitMQ() {
  if (channel) return channel;

  try {
    connection = await amqp.connect('amqp://localhost');
    channel = await connection.createChannel();
    await channel.assertExchange('chatbot-exchange', 'direct', { durable: true });
    console.log('[RabbitMQ] Connected and exchange asserted.');
    return channel;
  } catch (error) {
    console.error('[RabbitMQ] Failed to connect:', error);
    throw error;
  }
}

async function publishToQueue(exchange, routingKey, message) {
  const channel = await connectRabbitMQ();
  channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });
  console.log(`[RabbitMQ] Published message to ${exchange} with key ${routingKey}`);
}

module.exports = { publishToQueue, connectRabbitMQ };
