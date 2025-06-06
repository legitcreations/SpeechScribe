require('dotenv').config();

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

// Serve frontend static files
app.use(express.static(path.resolve(__dirname, '../SpeechScribe_Frontend/Public')));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../SpeechScribe_Frontend/Public/index.html'));
});

// 404 handler for unmatched routes (should be last)
app.use((req, res) => {
  res.status(404).sendFile(path.resolve(__dirname, '../SpeechScribe_Frontend/Public/404.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});