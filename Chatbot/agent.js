const amqp = require("amqplib");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const EXCHANGE = 'chatbot-exchange';
const EXCHANGE_TYPE = 'direct';
const QUEUE_QUESTIONS = 'user-questions';
const ROUTING_KEY_QUESTION = 'question';
const ROUTING_KEY_REPLY = 'reply';

/**
 * A helper function to retry an async operation with exponential backoff.
 * @param {() => Promise<T>} fn The async function to retry.
 * @param {number} retries The maximum number of retries.
 * @param {number} delay The initial delay in milliseconds.
 * @returns {Promise<T>}
 * @template T
 */
async function retryWithBackoff(fn, retries = 3, delay = 2000) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // Only retry on 5xx server errors (like 503 Service Unavailable)
      if (error.message && error.message.includes('[503')) {
        if (i < retries - 1) {
          const backoffDelay = delay * Math.pow(2, i);
          console.warn(`[Gemini] API service unavailable. Retrying in ${backoffDelay / 1000}s...`);
          await new Promise(res => setTimeout(res, backoffDelay));
        }
      } else {
        // Don't retry on other errors (e.g., bad request, invalid key)
        throw lastError;
      }
    }
  }
  throw lastError;
}

async function startAgent() {
  let connection;
  try {
    connection = await amqp.connect("amqp://localhost");
    const channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE, EXCHANGE_TYPE, { durable: true });
    await channel.assertQueue(QUEUE_QUESTIONS, { durable: true });
    await channel.bindQueue(QUEUE_QUESTIONS, EXCHANGE, ROUTING_KEY_QUESTION);

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
          EXCHANGE,
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
    console.log("[Agent] Retrying in 5 seconds...");
    setTimeout(startAgent, 5000);
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

// Main execution
async function main() {
  console.log("🚀 Starting Chatbot Agent Service...");
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ FATAL: GEMINI_API_KEY is not defined.");
    console.error("Please ensure you have a '.env' file in the 'Chatbot' directory with the line: GEMINI_API_KEY=your_actual_key");
    process.exit(1);
  }

  // Test Gemini API
  const apiWorking = await testGeminiAPI();
  if (!apiWorking) {
    console.error("❌ Cannot start agent - Gemini API not working");
    process.exit(1);
  }

  await startAgent();
}

main();