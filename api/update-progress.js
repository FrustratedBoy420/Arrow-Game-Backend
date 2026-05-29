const { getRoom, setRoom } = require('./_lib/rooms');
const pusher = require('./_lib/pusher');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, roomCode, arrowsLeft } = req.body;
    if (!name || !roomCode || arrowsLeft === undefined) {
      return res.status(400).json({ type: 'error', data: { message: 'name, roomCode, arrowsLeft are required' } });
    }

    const code = roomCode.trim().toUpperCase();
    const room = await getRoom(code);

    if (!room || room.status !== 'playing') {
      // Silently ignore progress updates for non-active rooms
      return res.status(200).json({ success: true });
    }

    const player = room.players.find(p => p.name === name.trim());
    if (player) {
      player.arrowsLeft = arrowsLeft;
      await setRoom(code, room);
    }

    // Broadcast to opponents in the room (all subscribers will receive it and filter themselves)
    await pusher.trigger(`room-${code}`, 'opponent_progress', {
      name: name.trim(),
      arrowsLeft,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ update-progress error:', err);
    return res.status(500).json({ type: 'error', data: { message: 'Internal server error' } });
  }
};
