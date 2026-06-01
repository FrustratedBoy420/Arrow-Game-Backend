const redis = require('../_lib/redis');
const pusher = require('../_lib/pusher');

module.exports = async (req, res) => {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { systemId, unlocked } = req.body;
    const clientSecret = req.headers['x-admin-secret'] || req.body.adminSecret;

    // Security Check: If ADMIN_SECRET is set in environment, enforce it.
    if (process.env.ADMIN_SECRET && process.env.ADMIN_SECRET !== clientSecret) {
      return res.status(401).json({ error: 'Unauthorized: Invalid admin secret' });
    }

    if (!systemId) {
      return res.status(400).json({ error: 'systemId is required' });
    }

    const key = `user:${systemId}`;
    const userStr = await redis.get(key);
    if (!userStr) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = typeof userStr === 'string' ? JSON.parse(userStr) : userStr;
    userData.unlocked = !!unlocked;

    // Save updated user record back to Redis, preserving the existing 30-day TTL
    await redis.set(key, JSON.stringify(userData), { keepttl: true });

    console.log(`🔧 Admin updated level access for User [${userData.name}] (System ID: ${systemId}) to Unlocked: ${userData.unlocked}`);

    // Broadcast level access update to the specific client in real-time via Pusher
    try {
      await pusher.trigger(`user-${systemId}`, 'level_access_changed', {
        allLevelsUnlocked: userData.unlocked
      });
      console.log(`📡 Broadcasted level_access_changed event to Pusher channel: user-${systemId}`);
    } catch (pushErr) {
      console.error('⚠️ Pusher trigger failed in toggle-user-levels:', pushErr);
    }

    return res.status(200).json({
      success: true,
      message: `Level access for system ID [${systemId}] set to ${userData.unlocked ? 'Unlocked' : 'Locked'}.`
    });

  } catch (err) {
    console.error('❌ POST admin/toggle-user-levels error:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error'
    });
  }
};
