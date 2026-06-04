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
      return res.status(200).json({ success: true });
    }

    const player = room.players.find(p => p.name === playerName);
    if (!player || player.status !== 'playing') {
      return res.status(200).json({ success: true });
    }

    player.status = 'failed_lives';
    player.timeMs = null;
    console.log(`💀 Player [${playerName}] ran out of lives in room [${code}]`);

    await setRoom(code, room);

    const opponent = room.players.find(p => p.name !== playerName);

    if (!opponent) {
      await endMatch(code); // Solo failure
    } else if (opponent.status === 'won') {
      await endMatch(code, opponent.name);
    } else if (opponent.status === 'failed' || opponent.status === 'failed_lives') {
      await endMatch(code, 'None'); // Both failed → draw
    } else {
      // Opponent still playing → they win automatically
      await endMatch(code, opponent.name);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ player-failed error:', err);
    return res.status(500).json({ type: 'error', data: { message: 'Internal server error' } });
  }
};
