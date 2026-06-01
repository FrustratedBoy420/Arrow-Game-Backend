const redis = require('../_lib/redis');

module.exports = async (req, res) => {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const clientSecret = req.headers['x-admin-secret'] || req.query.adminSecret;

    // Security Check: If ADMIN_SECRET is set in environment, enforce it.
    if (process.env.ADMIN_SECRET && process.env.ADMIN_SECRET !== clientSecret) {
      return res.status(401).json({ error: 'Unauthorized: Invalid admin secret' });
    }

    console.log('📡 Fetching registered user list from Redis...');
    
    // Fetch all user systemIds from the Redis Set
    const systemIds = await redis.smembers('game:users');
    const users = [];

    if (systemIds && systemIds.length > 0) {
      // Fetch user profile details in parallel
      const rawUsers = await Promise.all(systemIds.map(id => redis.get(`user:${id}`)));
      rawUsers.forEach((u) => {
        if (u) {
          const userData = typeof u === 'string' ? JSON.parse(u) : u;
          users.push(userData);
        }
      });
    }

    console.log(`✅ Returned ${users.length} user profiles.`);
    return res.status(200).json({ users });

  } catch (err) {
    console.error('❌ GET admin/users error:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error'
    });
  }
};
