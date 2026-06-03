const { getRoom } = require('./_lib/rooms');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { roomCode } = req.body;
    if (!roomCode) {
      return res.status(400).json({ type: 'error', data: { message: 'roomCode is required' } });
    }

    const code = roomCode.trim().toUpperCase();
    const room = await getRoom(code);
    if (!room) {
      return res.status(404).json({ type: 'error', data: { message: `Room ${code} not found` } });
    }

    return res.status(200).json({
      success: true,
      data: {
        roomCode: code,
        players: room.players.map(p => p.name),
        level: room.level,
        status: room.status,
      },
    });
  } catch (err) {
    console.error('❌ get-room error:', err);
    return res.status(500).json({ type: 'error', data: { message: 'Internal server error' } });
  }
};
