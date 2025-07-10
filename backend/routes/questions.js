const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { publishToQueue } = require('../rabbitmq/publisher');
const { EXCHANGE_CHATBOT, ROUTING_KEY_QUESTION } = require('../../shared/constants');

const router = express.Router();

router.post('/', async (req, res) => {
  const { userId, question } = req.body;

  if (!userId || !question) {
    return res.status(400).json({ error: 'userId and question are required' });
  }

  const questionId = uuidv4();

  const message = {
    questionId,
    userId,
    question,
    timestamp: new Date().toISOString()
  };

  try {
    await publishToQueue(EXCHANGE_CHATBOT, ROUTING_KEY_QUESTION, message);
    res.status(200).json({ success: true, questionId });
  } catch (error) {
    console.error('[RabbitMQ] Error publishing question:', error);
    res.status(500).json({ error: 'Failed to publish question' });
  }
});

module.exports = router;
