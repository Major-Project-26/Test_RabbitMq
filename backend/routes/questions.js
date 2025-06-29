// routes/questions.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { publishToQueue } = require('../rabbitmq/publisher');

const router = express.Router();

router.post('/', async (req, res) => {
  const { userId, question } = req.body;

  if (!userId || !question) {
    return res.status(400).json({ error: 'userId and question required' });
  }

  const questionId = uuidv4();

  const message = {
    questionId,
    userId,
    question,
    timestamp: new Date().toISOString()
  };

  try {
    await publishToQueue('chatbot_exchange', 'question.user.' + userId, message);
    res.status(200).json({ success: true, questionId });
  } catch (error) {
    console.error('Error publishing to RabbitMQ:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
