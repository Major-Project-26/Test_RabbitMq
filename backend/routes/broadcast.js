const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { publishBroadcast } = require('../rabbitmq/publisher');
const { EXCHANGE_COMMUNITY } = require('../../shared/constants');

const router = express.Router();

router.post('/', async (req, res) => {
  const { message, adminId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const broadcastMessage = {
    id: uuidv4(),
    message: message.trim(),
    adminId: adminId || 'admin',
    timestamp: new Date().toISOString(),
    type: 'broadcast'
  };

  try {
    await publishBroadcast(broadcastMessage);
    res.status(200).json({ 
      success: true, 
      messageId: broadcastMessage.id,
      message: 'Broadcast sent successfully'
    });
  } catch (error) {
    console.error('[RabbitMQ] Error publishing broadcast:', error);
    res.status(500).json({ error: 'Failed to send broadcast message' });
  }
});

module.exports = router;
