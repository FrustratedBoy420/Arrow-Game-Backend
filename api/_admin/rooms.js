const redis = require('../_lib/redis');
const { verifyAdmin } = require('../_lib/auth');

module.exports = async (req, res) => {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret, x-admin-username, x-admin-password');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Security Check: Validate admin credentials.
    if (!verifyAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized: Invalid admin credentials' });
    }

    console.log('📡 Fetching active multiplayer rooms from Redis...');
    
    // Find all room keys
    const keys = await redis.keys('room:*');
    const rooms = [];

    if (keys && keys.length > 0) {
      // Fetch room details in parallel
      const rawRooms = await Promise.all(keys.map(k => redis.get(k)));
      rawRooms.forEach((r) => {
        if (r) {
          const roomData = typeof r === 'string' ? JSON.parse(r) : r;
          rooms.push(roomData);
        }
      });
    }

    console.log(`✅ Returned ${rooms.length} active rooms.`);
    return res.status(200).json({ rooms });

  } catch (err) {
    console.error('❌ GET admin/rooms error:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error'
    });
  }
};
