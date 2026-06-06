const redis = require('./_lib/redis');

// 30 days in seconds — profiles inactive longer than this are auto-deleted
const USER_TTL_SECONDS = 60 * 60 * 24 * 30;

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { systemId, name, os, osVersion } = req.body;
    if (!systemId) {
      return res.status(400).json({ error: 'systemId is required' });
    }

    // Retrieve existing user record to check if they are unlocked and keep existing name
    const existingStr = await redis.get(`user:${systemId}`);
    let unlocked = false;
    let existingName = 'Guest';
    let existingIp = 'unknown';
    if (existingStr) {
      const existing = typeof existingStr === 'string' ? JSON.parse(existingStr) : existingStr;
      unlocked = !!existing.unlocked;
      existingName = existing.name || 'Guest';
      existingIp = existing.ip || 'unknown';
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.headers['x-real-ip'] || req.socket.remoteAddress || existingIp;

    const userData = {
      systemId,
      name: name || existingName,
      os: os || 'unknown',
      osVersion: osVersion || 'unknown',
      highestUnlockedLevel: 1,
      lastActive: Date.now(),
      unlocked,
      ip
    };

    // Save to Redis with 30-day TTL (refreshed each time the user opens the app)
    // and add to set of registered users
    await redis.set(`user:${systemId}`, JSON.stringify(userData), { ex: USER_TTL_SECONDS });
    await redis.sadd('game:users', systemId);

    console.log(`👤 Registered user profile: [${userData.name}] (System ID: ${systemId}, Unlocked: ${unlocked})`);

    return res.status(200).json({
      success: true,
      allLevelsUnlocked: unlocked
    });

  } catch (err) {
    console.error('❌ register-user error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};
