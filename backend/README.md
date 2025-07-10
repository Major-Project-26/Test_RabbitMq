# Backend Service

This service handles API requests, WebSocket connections, and communication with RabbitMQ for both the one-to-one chatbot and the community broadcast system.

## Architecture

1.  **Express Server**: Exposes HTTP endpoints.
    *   `POST /ask`: Receives a question from a user, adds it to the `user-questions` queue in RabbitMQ.
    *   `POST /broadcast`: Receives a message from an admin, publishes it to the `community-exchange` (fanout) in RabbitMQ.
2.  **WebSocket Server (`ws`)**: Manages real-time connections.
    *   **Chat Connections**: `ws://localhost:3001?userId=<USER_ID>&type=chat`
    *   **Community Connections**: `ws://localhost:3001?userId=<USER_ID>&type=community`
3.  **RabbitMQ Consumers**:
    *   **Reply Consumer**: Listens to the `bot-replies` queue. When a message arrives, it's sent to the correct user via their chat WebSocket.
    *   **Broadcast Consumer**: Listens to a temporary queue bound to the `community-exchange`. When a message arrives, it's sent to *all* connected community clients via their WebSockets.

## How to Run

### Prerequisites

-   Node.js (v18 or later)
-   Docker (for RabbitMQ)

### Instructions

1.  **Start RabbitMQ**: From the project root (`d:/chatbot/Test_RabbitMq/`), run:
    ```bash
    docker-compose up
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Start the Server**:
    ```bash
    npm start
    ```

The server will be running on `http://localhost:3001`.
