const { setGameConfig } = require('../_lib/config');
const { verifyAdmin } = require('../_lib/auth');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret, x-admin-username, x-admin-password');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, data } = req.body;

    // Security Check: Validate admin credentials.
    if (!verifyAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized: Invalid admin credentials' });
    }

    if (!type || !data) {
      return res.status(400).json({ error: 'type and data are required' });
    }

    if (type === 'room_terminate') {
      const { deleteRoom } = require('../_lib/rooms');
      const roomCode = String(data).trim().toUpperCase();
      await deleteRoom(roomCode);
      console.log(`🔧 Admin terminated room: ${roomCode}`);

      try {
        const pusher = require('../_lib/pusher');
        await pusher.trigger(`room-${roomCode}`, 'room_terminated', {
          roomCode,
          message: 'Room was terminated by administrator.'
        });
        console.log(`📡 Broadcasted room_terminated event for room: ${roomCode}`);
      } catch (pushErr) {
        console.error('⚠️ Pusher trigger failed in update-config room_terminate:', pushErr);
      }

      return res.status(200).json({
        success: true,
        message: `Room [${roomCode}] terminated successfully.`
      });
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
