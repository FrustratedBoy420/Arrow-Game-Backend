const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'matches.json');

async function connectDB() {
  console.log('✅ Running server in local file-logging mode (logs saved to matches.json).');
}

async function logMatch(matchData) {
  try {
    let logs = [];
    if (fs.existsSync(LOG_FILE)) {
      try {
        const fileData = fs.readFileSync(LOG_FILE, 'utf8');
        if (fileData.trim()) {
          logs = JSON.parse(fileData);
        }
      } catch (e) {
        console.error('⚠️ Could not parse existing matches.json, creating a new log list:', e.message);
      }
    }

    const newLog = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      ...matchData,
      createdAt: new Date().toISOString()
    };

    logs.push(newLog);
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf8');
    console.log(`💾 Saved match log to local file (ID: ${newLog.id})`);
    return newLog;
  } catch (error) {
    console.error('❌ Failed to save match log to local file:', error);
    return null;
  }
}

module.exports = {
  connectDB,
  logMatch
};
