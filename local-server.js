/**
 * Arrow Escape - Local Backend Runner (Alternative to vercel dev)
 *
 * This script runs the Vercel Serverless API handlers locally in a standard Express server.
 * You don't need vercel login credentials to run this.
 *
 * Run it: node local-server.js
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

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
app.post('/api/create-room', adaptHandler('./api/create-room'));
app.post('/api/join-room', adaptHandler('./api/join-room'));
app.post('/api/toggle-ready', adaptHandler('./api/toggle-ready'));
app.post('/api/rematch-request', adaptHandler('./api/rematch-request'));
app.post('/api/leave-room', adaptHandler('./api/leave-room'));
app.post('/api/update-progress', adaptHandler('./api/update-progress'));
app.post('/api/player-finished', adaptHandler('./api/player-finished'));
app.post('/api/player-failed', adaptHandler('./api/player-failed'));
app.post('/api/register-user', adaptHandler('./api/register-user'));
app.get('/api/health', adaptHandler('./api/health'));

// Dynamic config & Admin routes
app.get('/api/config', adaptHandler('./api/config'));
app.get('/api/admin/rooms', adaptHandler('./api/admin/rooms'));
app.post('/api/admin/update-config', adaptHandler('./api/admin/update-config'));
app.get('/api/admin/users', adaptHandler('./api/admin/users'));
app.post('/api/admin/toggle-user-levels', adaptHandler('./api/admin/toggle-user-levels'));

// Default 404 for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log('==================================================');
  console.log(`🚀 Arrow Escape Backend running locally at:`);
  console.log(`   http://localhost:${PORT}`);
  console.log('==================================================');
});
