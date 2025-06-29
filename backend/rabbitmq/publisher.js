// rabbitmq/publisher.js
const amqp = require('amqplib');

let channel;
let connection;

async function connectRabbitMQ() {
  if (!connection) {
    connection = await amqp.connect('amqp://localhost');
    channel = await connection.createChannel();

    await channel.assertExchange('chatbot_exchange', 'topic', { durable: true });
  }
  return channel;
}

async function publishToQueue(exchange, routingKey, message) {
  const channel = await connectRabbitMQ();
  channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });
  console.log(`📤 Published message to ${exchange} → ${routingKey}`);
}

module.exports = { publishToQueue };
