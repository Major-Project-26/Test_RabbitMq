const amqp = require('amqplib');

const EXCHANGE = 'chatbot-exchange';
const EXCHANGE_TYPE = 'direct';
const QUEUE_QUESTIONS = 'user-questions';
const QUEUE_REPLIES = 'bot-replies';
const ROUTING_KEY_QUESTION = 'question';
const ROUTING_KEY_REPLY = 'reply';

async function setup() {
    try {
        const conn = await amqp.connect('amqp://localhost');
        const channel = await conn.createChannel();

        // 1. Declare Exchange
        await channel.assertExchange(EXCHANGE, EXCHANGE_TYPE, { durable: true });

        // 2. Declare Queues
        await channel.assertQueue(QUEUE_QUESTIONS, { durable: true });
        await channel.assertQueue(QUEUE_REPLIES, { durable: true });

        // 3. Bind Queues to Exchange
        await channel.bindQueue(QUEUE_QUESTIONS, EXCHANGE, ROUTING_KEY_QUESTION);
        await channel.bindQueue(QUEUE_REPLIES, EXCHANGE, ROUTING_KEY_REPLY);

        console.log("✅ Exchange, Queues, and Bindings are set up.");

        await channel.close();
        await conn.close();
    } catch (err) {
        console.error("❌ Failed to set up RabbitMQ:", err);
    }
}

setup();
