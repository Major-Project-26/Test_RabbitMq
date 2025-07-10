const RABBITMQ_CONSTANTS = {
  EXCHANGE_CHATBOT: 'chatbot-exchange',
  EXCHANGE_COMMUNITY: 'community-exchange',
  EXCHANGE_DISCUSSIONS: 'discussions-exchange',

  QUEUE_QUESTIONS: 'user-questions',
  QUEUE_REPLIES: 'bot-replies',

  ROUTING_KEY_QUESTION: 'question',
  ROUTING_KEY_REPLY: 'reply',

  EXCHANGE_TYPE_DIRECT: 'direct',
  EXCHANGE_TYPE_FANOUT: 'fanout',
  EXCHANGE_TYPE_TOPIC: 'topic',
};

module.exports = RABBITMQ_CONSTANTS;
