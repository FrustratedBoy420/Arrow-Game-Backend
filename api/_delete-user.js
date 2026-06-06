const redis = require('./_lib/redis');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { systemId } = req.body;
    if (!systemId) {
      return res.status(400).json({ error: 'systemId is required' });
    }

    // Delete user profile and remove from active users list
    await redis.del(`user:${systemId}`);
    await redis.srem('game:users', systemId);

    console.log(`🗑️ Deleted user profile: System ID: ${systemId}`);

    return res.status(200).json({
      success: true,
      message: 'Account and associated data successfully deleted.'
    });

  } catch (err) {
    console.error('❌ delete-user error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};
