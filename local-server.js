/**
 * ArrowVerse-Multiplayer - Local Backend Runner (Alternative to vercel dev)
 *
 * This script runs the Vercel Serverless API handlers locally in a standard Express server.
 * You don't need vercel login credentials to run this.
 *
 * Run it: node local-server.js
 */

require('dotenv').config();
const app = require('./api/index');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('==================================================');
  console.log(`🚀 ArrowVerse-Multiplayer Backend running locally at:`);
  console.log(`   http://localhost:${PORT}`);
  console.log('==================================================');
});
