const amqp = require("amqplib");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const { 
  EXCHANGE_CHATBOT, 
  EXCHANGE_TYPE_DIRECT, 
  QUEUE_QUESTIONS, 
  ROUTING_KEY_QUESTION, 
  ROUTING_KEY_REPLY 
} = require('../shared/constants');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function retryWithBackoff(fn, retries = 3, delay = 2000) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (error.message && error.message.includes('[503')) {
        if (i < retries - 1) {
          const backoffDelay = delay * Math.pow(2, i);
          console.warn(`[Gemini] API service unavailable. Retrying in ${backoffDelay / 1000}s...`);
          await new Promise(res => setTimeout(res, backoffDelay));
        }
      } else {
        throw lastError;
      }
    }
  }
  throw lastError;
}

async function startAgent() {
  let connection;
  try {
    console.log("[Agent] Connecting to RabbitMQ...");
    connection = await amqp.connect("amqp://localhost");
    const channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_CHATBOT, EXCHANGE_TYPE_DIRECT, { durable: true });
    await channel.assertQueue(QUEUE_QUESTIONS, { durable: true });
    await channel.bindQueue(QUEUE_QUESTIONS, EXCHANGE_CHATBOT, ROUTING_KEY_QUESTION);

    console.log("[RabbitMQ] Chatbot agent listening for questions.");
    await channel.prefetch(1);

    channel.consume(QUEUE_QUESTIONS, async (msg) => {
      if (!msg) return;

      try {
        const { userId, questionId, question } = JSON.parse(msg.content.toString());
        console.log(`[RabbitMQ] Received question ${questionId} from ${userId}: "${question}"`);

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await retryWithBackoff(() => model.generateContent(question));
        const answer = result.response.text();

        const responseMessage = {
          questionId,
          userId,
          payload: answer,
        };

        channel.publish(
          EXCHANGE_CHATBOT,
          ROUTING_KEY_REPLY,
          Buffer.from(JSON.stringify(responseMessage)),
          { persistent: true }
        );
        console.log(`[RabbitMQ] Sent reply for ${questionId}`);

        channel.ack(msg);
      } catch (error) {
        console.error(`[Agent] Error processing message:`, error);
        channel.nack(msg, false, false);
      }
    });

    process.on("SIGINT", async () => {
      console.log("\n[Agent] Shutting down gracefully...");
      await channel.close();
      await connection.close();
      process.exit(0);
    });

  } catch (err) {
    console.error("[Agent] Error starting agent:", err.message);
    if (connection) await connection.close();
    throw err; // Re-throw to be caught by the retry logic in main
  }
}

async function testGeminiAPI() {
  try {
    console.log("🧪 Testing Gemini API connection...");
    const testFn = async () => {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent("Hello, are you working?");
      return result.response;
    };
    const response = await retryWithBackoff(testFn);
    console.log("✅ Gemini API test successful:", response.text());
    return true;
  } catch (error) {
    console.error("❌ Gemini API test failed after multiple retries:", error.message);
    return false;
  }
}

async function main() {
  console.log("🚀 Starting Chatbot Agent Service...");
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ FATAL: GEMINI_API_KEY is not defined.");
    console.error("Please ensure you have a '.env' file in the 'Chatbot' directory with the line: GEMINI_API_KEY=your_actual_key");
    process.exit(1);
  }

  const isApiReady = await testGeminiAPI();
  if (!isApiReady) {
    console.error("❌ Cannot start agent - Gemini API is not responding.");
    process.exit(1);
  }

  await retryWithBackoff(startAgent, 5, 5000).catch(err => {
    console.error("❌ [Agent] Could not connect to RabbitMQ after multiple retries. Exiting.", err.message);
    process.exit(1);
  });
}

main();