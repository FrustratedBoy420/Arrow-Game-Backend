/**
 * Public config endpoint — returns Pusher public credentials to the frontend.
 * Note: PUSHER_KEY is safe to expose (it's the public key, not the secret).
 */
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  return res.status(200).json({
    pusherKey: process.env.PUSHER_KEY,
    pusherCluster: process.env.PUSHER_CLUSTER,
  });
};
