const { getRoom, setRoom } = require('./_lib/rooms');
const { endMatch } = require('./_lib/gameLogic');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, roomCode, scores } = req.body;
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

    // Recalculate final scores from room.arrowOwners to prevent any final mismatch
    if (!room.arrowOwners) room.arrowOwners = {};
    const finalScores = {};
    room.players.forEach(p => {
      finalScores[p.name] = 0;
    });
    Object.values(room.arrowOwners).forEach(owner => {
      const matchedPlayer = room.players.find(p => p.name.toLowerCase() === owner.toLowerCase());
      if (matchedPlayer) {
        finalScores[matchedPlayer.name]++;
      }
    });
    room.players.forEach(p => {
      p.score = finalScores[p.name] || 0;
    });

    console.log(`🏁 Player [${playerName}] finished in room [${code}] — ${(timeMs / 1000).toFixed(2)}s`);

    const opponent = room.players.find(p => p.name !== playerName);
    if (opponent && opponent.status === 'playing') {
      opponent.status = 'failed';
    }

    await setRoom(code, room);

    // End match and let gameLogic determine the winner by comparing scores
    await endMatch(code);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ player-finished error:', err);
    return res.status(500).json({ type: 'error', data: { message: 'Internal server error' } });
  }
};
