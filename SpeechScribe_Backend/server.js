require('dotenv').config();
process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});
const express = require('express');
const path = require('path');
const cors = require('cors');
const authRoutes = require('./auth');

const app = express();
const PORT = 2000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);

app.use(express.static(path.resolve(__dirname, '..')));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../SpeechScribe_Frontend/Public/index.html'));
});

app.get('/ping', (req, res) => {
  res.send('pong');
});

// 404 handler for unmatched routes (should be last)
app.use((req, res) => {
  res.status(404).sendFile(path.resolve(__dirname, '../SpeechScribe_Frontend/Public/404.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

