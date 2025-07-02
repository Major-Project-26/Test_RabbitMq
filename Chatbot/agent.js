const amqp = require("amqplib");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Load your Gemini API key directly (for testing)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function startAgent() {
  let connection;
  let channel;

  try {
    // Connect to RabbitMQ
    connection = await amqp.connect("amqp://localhost");
    channel = await connection.createChannel();

    // Use the same exchange as your backend (Friend 2)
    const exchange = "chatbot_ex"; // Changed from amq.direct
    const queueName = "questions_general";

    // Declare the exchange (should match your backend)
    await channel.assertExchange(exchange, "direct", { durable: true });

    // Declare and bind the queue
    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, exchange, "questions.general");

    console.log("🤖 Chatbot agent listening on", queueName);
    console.log("🔗 Connected to exchange:", exchange);

    // Set prefetch to 1 to handle one message at a time
    await channel.prefetch(1);

    channel.consume(queueName, async (msg) => {
      if (!msg) return;

      try {
        const messageData = JSON.parse(msg.content.toString());
        const { userId, question, questionId, timestamp } = messageData;

        console.log(`📩 Received question from ${userId}: ${question}`);
        console.log(`🆔 Question ID: ${questionId}`);

        // Generate answer using Gemini
        console.log("🧠 Generating AI response...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent(question);
        const response = await result.response;
        const answer = response.text();

        console.log(
          "✅ AI Answer generated:",
          answer.substring(0, 100) + "..."
        );

        // Prepare the response message
        const responseMessage = {
          questionId: questionId,
          userId: userId,
          answer: answer,
          timestamp: new Date().toISOString(),
          status: "completed",
        };

        // Publish to user-specific queue
        const responseRoutingKey = `answer_${userId}`;
        const responseQueue = `answer_${userId}`;

        // Declare user-specific queue
        await channel.assertQueue(responseQueue, { durable: true });
        await channel.bindQueue(responseQueue, exchange, responseRoutingKey);

        // Publish the answer
        await channel.publish(
          exchange,
          responseRoutingKey,
          Buffer.from(JSON.stringify(responseMessage)),
          { persistent: true }
        );

        console.log(`📤 Sent answer to queue: ${responseQueue}`);
        console.log(`🔑 Routing key: ${responseRoutingKey}`);

        // IMPORTANT: Acknowledge the message
        channel.ack(msg);
      } catch (error) {
        console.error("❌ Error processing message:", error);

        // If there's an error, acknowledge the message to prevent redelivery
        // In production, you might want to implement retry logic or dead letter queues
        channel.nack(msg, false, false);
      }
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      console.log("\n🛑 Shutting down gracefully...");
      if (channel) await channel.close();
      if (connection) await connection.close();
      process.exit(0);
    });
  } catch (err) {
    console.error("❌ Error starting chatbot agent:", err);

    // Clean up connections on error
    if (channel) await channel.close();
    if (connection) await connection.close();

    // Retry after 5 seconds
    console.log("🔄 Retrying in 5 seconds...");
    setTimeout(startAgent, 5000);
  }
}

// Test function to verify Gemini API works
async function testGeminiAPI() {
  try {
    console.log("🧪 Testing Gemini API connection...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello, are you working?");
    const response = await result.response;
    console.log("✅ Gemini API test successful:", response.text());
    return true;
  } catch (error) {
    console.error("❌ Gemini API test failed:", error);
    return false;
  }
}

// Main execution
async function main() {
  console.log("🚀 Starting Chatbot Agent Service...");

  // Test Gemini API first
  const apiWorking = await testGeminiAPI();
  if (!apiWorking) {
    console.error("❌ Cannot start agent - Gemini API not working");
    process.exit(1);
  }

  // Start the agent
  await startAgent();
}

main();
