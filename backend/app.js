// app.js
const express = require('express');
const bodyParser = require('body-parser');
const questionRoutes = require('./routes/questions');

const app = express();
app.use(bodyParser.json());

app.use('/ask', questionRoutes);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
});
