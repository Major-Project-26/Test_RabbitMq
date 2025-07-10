const amqp = require('amqplib');
const { EXCHANGE_CHATBOT, EXCHANGE_COMMUNITY, EXCHANGE_DISCUSSIONS, EXCHANGE_TYPE_DIRECT, EXCHANGE_TYPE_FANOUT, EXCHANGE_TYPE_TOPIC } = require('../../shared/constants');

let channel;
let connection;

async function connectRabbitMQ() {
  if (channel) return channel;

  try {
    connection = await amqp.connect('amqp://localhost');
    channel = await connection.createChannel();
    
    await channel.assertExchange(EXCHANGE_CHATBOT, EXCHANGE_TYPE_DIRECT, { durable: true });
    await channel.assertExchange(EXCHANGE_COMMUNITY, EXCHANGE_TYPE_FANOUT, { durable: false });
    await channel.assertExchange(EXCHANGE_DISCUSSIONS, EXCHANGE_TYPE_TOPIC, { durable: false });
    
    console.log('[RabbitMQ] Connected and exchanges asserted.');
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

async function publishBroadcast(message) {
  const channel = await connectRabbitMQ();
  channel.publish(EXCHANGE_COMMUNITY, '', Buffer.from(JSON.stringify(message)));
  console.log(`[RabbitMQ] Published broadcast message: ${message.id}`);
}

module.exports = { publishToQueue, connectRabbitMQ, publishBroadcast };
