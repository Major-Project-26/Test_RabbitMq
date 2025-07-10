const amqp = require('amqplib');
const { 
  EXCHANGE_CHATBOT, 
  EXCHANGE_TYPE_DIRECT, 
  QUEUE_QUESTIONS, 
  QUEUE_REPLIES, 
  ROUTING_KEY_QUESTION, 
  ROUTING_KEY_REPLY 
} = require('../shared/constants');

async function setup() {
    try {
        const conn = await amqp.connect('amqp://localhost');
        const channel = await conn.createChannel();

        await channel.assertExchange(EXCHANGE_CHATBOT, EXCHANGE_TYPE_DIRECT, { durable: true });

        await channel.assertQueue(QUEUE_QUESTIONS, { durable: true });
        await channel.assertQueue(QUEUE_REPLIES, { durable: true });

        await channel.bindQueue(QUEUE_QUESTIONS, EXCHANGE_CHATBOT, ROUTING_KEY_QUESTION);
        await channel.bindQueue(QUEUE_REPLIES, EXCHANGE_CHATBOT, ROUTING_KEY_REPLY);

        console.log("✅ Exchange, Queues, and Bindings are set up.");

        await channel.close();
        await conn.close();
    } catch (err) {
        console.error("❌ Failed to set up RabbitMQ:", err);
    }
}

setup();
