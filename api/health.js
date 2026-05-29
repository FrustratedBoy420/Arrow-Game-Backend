const levelsData = require('../level.json');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  res.json({
    status: 'ok',
    version: '2.0.0 (Vercel)',
    levelsCount: levelsData.length,
    timestamp: new Date().toISOString(),
  });
};
