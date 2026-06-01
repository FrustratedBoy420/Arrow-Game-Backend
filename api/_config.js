const { getGameLevels, getGameMusic, getGameIcons } = require('./_lib/config');

/**
 * Public config endpoint — returns Pusher public credentials and dynamic game configuration (levels, music, icons) to the frontend.
 * Note: PUSHER_KEY is safe to expose (it's the public key, not the secret).
 */
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const [levels, music, icons] = await Promise.all([
      getGameLevels(),
      getGameMusic(),
      getGameIcons()
    ]);

    return res.status(200).json({
      pusherKey: process.env.PUSHER_KEY,
      pusherCluster: process.env.PUSHER_CLUSTER,
      levels,
      music,
      icons
    });
  } catch (err) {
    console.error('❌ Error getting config:', err);
    return res.status(500).json({
      error: 'Failed to fetch dynamic configuration'
    });
  }
};

