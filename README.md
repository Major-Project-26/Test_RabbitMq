# Chatbot with RabbitMQ, Gemini, and Next.js

This document explains the high-level architecture and provides instructions on how to run the project.

## High-Level Flow

The application is composed of three main services that communicate via a RabbitMQ message broker. This decoupled architecture allows for scalability and resilience.

1.  **User Sends a Question:** The user types a message in the **Frontend** (Next.js) and clicks send.
2.  **HTTP Request to Backend:** The frontend sends an HTTP POST request to the **Backend** (Express.js) at the `/ask` endpoint.
3.  **Message Published to RabbitMQ:** The backend receives the question, generates a unique `questionId` (a UUID/GUID), and publishes it as a message to the `chatbot-exchange` in RabbitMQ with the routing key `question`.
4.  **Agent Consumes Message:** The `direct` exchange routes the message to the `user-questions` queue. The **Chatbot Agent** is subscribed to this queue, so it picks up the message.
5.  **AI Processing:** The agent sends the question to the **Google Gemini API** to generate a response.
6.  **Reply Published to RabbitMQ:** The agent publishes the AI's answer back to the same `chatbot-exchange`, but this time with the routing key `reply`.
7.  **Backend Consumes Reply:** The exchange routes the reply to the `bot-replies` queue. The **Backend** is subscribed to this queue.
8.  **WebSocket Push to Frontend:** The backend receives the reply, identifies the correct user via their `userId`, and pushes the message to the user's **Frontend** through an active WebSocket connection. The user sees the bot's response in real-time.

## RabbitMQ Concepts Used

-   **Exchange:** `chatbot-exchange`
    -   **Type:** `direct`
    -   A **direct exchange** delivers messages to queues based on a **routing key**. The routing key of the message must exactly match the binding key of the queue.

-   **Queues:**
    -   `user-questions`: A durable queue that holds questions from users. It is bound to the exchange with the key `question`.
    -   `bot-replies`: A durable queue that holds answers from the AI. It is bound to the exchange with the key `reply`.

-   **Routing Keys:**
    -   `question`: Used by the backend to send messages to the `user-questions` queue.
    -   `reply`: Used by the chatbot agent to send messages to the `bot-replies` queue.

## How to Run

You will need **4 separate terminal windows** to run the entire system.

### Prerequisites

1.  **Node.js:** v18 or later.
2.  **Docker & Docker Compose:** For running RabbitMQ.
3.  **Gemini API Key:** Create a `.env` file at `d:/chatbot/Test_RabbitMq/Chatbot/.env` with your key:

    ```
    GEMINI_API_KEY=your_google_gemini_api_key_here
    ```

### Step 1: Start RabbitMQ (Terminal 1)

In the project root (`d:/chatbot/Test_RabbitMq/`), run:

```bash
docker-compose up
```

This uses the `docker-compose.yml` file to start a RabbitMQ container.

-   **Application Port:** `5672`
-   **Management UI:** [http://localhost:15672](http://localhost:15672) (user: `guest`, pass: `guest`)

### Step 2: Start the Backend API (Terminal 2)

```bash
# Navigate to the backend directory
cd d:\chatbot\Test_RabbitMq\backend

# Install dependencies
npm install

# Start the server
npm start
```

### Step 3: Start the Chatbot Agent (Terminal 3)

```bash
# Navigate to the Chatbot agent directory
cd d:\chatbot\Test_RabbitMq\Chatbot

# Install dependencies
npm install

# Start the agent
npm start
```

### Step 4: Start the Frontend (Terminal 4)

```bash
# Navigate to the frontend directory
cd d:\chatbot\Test_RabbitMq\frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Step 5: Use the Chatbot

Open your browser and navigate to **[http://localhost:3000/chat](http://localhost:3000/chat)**. You can now chat with the AI.
