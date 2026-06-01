const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS and JSON parsing
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-secret']
}));
app.use(express.json({ limit: '10mb' }));

// Helper to adapt Vercel Serverless Function signature (req, res) to Express
function adaptHandler(handlerPath) {
  return async (req, res) => {
    try {
      // Mock Vercel response helper methods if needed
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      
      const handler = require(handlerPath);
      await handler(req, res);
    } catch (err) {
      console.error(`❌ Error in handler [${handlerPath}]:`, err);
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  };
}

// Map Vercel Serverless routes to local Express endpoints
app.post('/api/create-room', adaptHandler('./_create-room'));
app.post('/api/join-room', adaptHandler('./_join-room'));
app.post('/api/toggle-ready', adaptHandler('./_toggle-ready'));
app.post('/api/rematch-request', adaptHandler('./_rematch-request'));
app.post('/api/leave-room', adaptHandler('./_leave-room'));
app.post('/api/update-progress', adaptHandler('./_update-progress'));
app.post('/api/player-finished', adaptHandler('./_player-finished'));
app.post('/api/player-failed', adaptHandler('./_player-failed'));
app.post('/api/register-user', adaptHandler('./_register-user'));
app.get('/api/health', adaptHandler('./_health'));

// Dynamic config & Admin routes
app.get('/api/config', adaptHandler('./_config'));
app.get('/api/admin/rooms', adaptHandler('./_admin/rooms'));
app.post('/api/admin/update-config', adaptHandler('./_admin/update-config'));
app.get('/api/admin/users', adaptHandler('./_admin/users'));
app.post('/api/admin/toggle-user-levels', adaptHandler('./_admin/toggle-user-levels'));

// Default 404 for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

module.exports = app;
