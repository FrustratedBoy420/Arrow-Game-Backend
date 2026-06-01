const { getRoom, setRoom } = require('./_lib/rooms');
const { endMatch } = require('./_lib/gameLogic');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, roomCode } = req.body;
    if (!name || !roomCode) {
      return res.status(400).json({ type: 'error', data: { message: 'name and roomCode are required' } });
    }

    const playerName = name.trim();
    const code = roomCode.trim().toUpperCase();

    const room = await getRoom(code);
    if (!room || room.status !== 'playing') {
      return res.status(200).json({ success: true }); // Ignore stale calls
    }

    const player = room.players.find(p => p.name === playerName);
    if (!player || player.status === 'won') {
      return res.status(200).json({ success: true }); // Already handled
    }

    // Calculate server-side time using the stored gameStartsAt timestamp
    const timeMs = Date.now() - room.startTime;
    player.status = 'won';
    player.timeMs = timeMs;
    player.arrowsLeft = 0;

    console.log(`🏁 Player [${playerName}] finished in room [${code}] — ${(timeMs / 1000).toFixed(2)}s`);

    await setRoom(code, room);

    const opponent = room.players.find(p => p.name !== playerName);

    if (!opponent || opponent.status === 'won' || opponent.status === 'failed') {
      // Both done — end match and determine winner by time
      await endMatch(code);
    } else {
      // This player finished first — declare winner immediately
      await endMatch(code, playerName);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ player-finished error:', err);
    return res.status(500).json({ type: 'error', data: { message: 'Internal server error' } });
  }
};
