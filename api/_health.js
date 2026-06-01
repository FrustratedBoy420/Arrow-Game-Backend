const { getGameLevels } = require('./_lib/config');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const levelsData = await getGameLevels();
    res.json({
      status: 'ok',
      version: '2.0.0 (Vercel)',
      levelsCount: levelsData.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ health endpoint error:', err);
    res.status(500).json({ status: 'error', error: 'Internal server error' });
  }
};

