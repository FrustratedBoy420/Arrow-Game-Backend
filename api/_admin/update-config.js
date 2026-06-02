const { setGameConfig } = require('../_lib/config');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, data, adminSecret } = req.body;
    const clientSecret = req.headers['x-admin-secret'] || adminSecret;

    // Security Check: If ADMIN_SECRET is set in environment, enforce it.
    if (process.env.ADMIN_SECRET && process.env.ADMIN_SECRET !== clientSecret) {
      return res.status(401).json({ error: 'Unauthorized: Invalid admin secret' });
    }

    if (!type || !data) {
      return res.status(400).json({ error: 'type and data are required' });
    }

    await setGameConfig(type, data);
    console.log(`🔧 Admin updated configuration for type: ${type}`);

    // Broadcast update globally in real-time
    try {
      const pusher = require('../_lib/pusher');
      await pusher.trigger('global-config', 'config_updated', { type });
      console.log(`📡 Broadcasted config_updated event for type: ${type}`);
    } catch (pushErr) {
      console.error('⚠️ Pusher trigger failed in update-config:', pushErr);
    }

    return res.status(200).json({
      success: true,
      message: `Configuration for type [${type}] updated successfully.`
    });
  } catch (err) {
    console.error('❌ update-config error:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error'
    });
  }
};
