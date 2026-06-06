const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS and JSON parsing
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-secret', 'x-admin-username', 'x-admin-password']
}));
app.use(express.json({ limit: '10mb' }));

// Helper to adapt Vercel Serverless Function signature (req, res) to Express
function adaptHandler(handler) {
  return async (req, res) => {
    try {
      // Mock Vercel response helper methods if needed
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      await handler(req, res);
    } catch (err) {
      console.error(`❌ Error in handler:`, err);
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  };
}

// Static imports so Vercel's bundler can trace and package the dependencies
const createRoom = require('./_create-room');
const joinRoom = require('./_join-room');
const getRoom = require('./_get-room');
const toggleReady = require('./_toggle-ready');
const rematchRequest = require('./_rematch-request');
const leaveRoom = require('./_leave-room');
const updateProgress = require('./_update-progress');
const playerFinished = require('./_player-finished');
const playerFailed = require('./_player-failed');
const registerUser = require('./_register-user');
const deleteUser = require('./_delete-user');
const health = require('./_health');
const config = require('./_config');

const adminRooms = require('./_admin/rooms');
const adminUpdateConfig = require('./_admin/update-config');
const adminUsers = require('./_admin/users');
const adminToggleUserLevels = require('./_admin/toggle-user-levels');

// Map Vercel Serverless routes to local Express endpoints
app.post('/api/create-room', adaptHandler(createRoom));
app.post('/api/join-room', adaptHandler(joinRoom));
app.post('/api/get-room', adaptHandler(getRoom));
app.post('/api/toggle-ready', adaptHandler(toggleReady));
app.post('/api/rematch-request', adaptHandler(rematchRequest));
app.post('/api/leave-room', adaptHandler(leaveRoom));
app.post('/api/update-progress', adaptHandler(updateProgress));
app.post('/api/player-finished', adaptHandler(playerFinished));
app.post('/api/player-failed', adaptHandler(playerFailed));
app.post('/api/register-user', adaptHandler(registerUser));
app.post('/api/delete-user', adaptHandler(deleteUser));
app.get('/api/health', adaptHandler(health));

// Dynamic config & Admin routes
app.get('/api/config', adaptHandler(config));
app.get('/api/admin/rooms', adaptHandler(adminRooms));
app.post('/api/admin/update-config', adaptHandler(adminUpdateConfig));
app.get('/api/admin/users', adaptHandler(adminUsers));
app.post('/api/admin/toggle-user-levels', adaptHandler(adminToggleUserLevels));

// Default 404 for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

module.exports = app;
