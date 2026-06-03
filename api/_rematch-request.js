const { getRoom, setRoom } = require('./_lib/rooms');
const pusher = require('./_lib/pusher');
const { getGameLevels } = require('./_lib/config');

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
    if (!room) {
      // Room no longer exists (expired or already cleaned up) — silently succeed
      console.log(`🔄 Rematch: room [${code}] not found (may have expired). Ignoring.`);
      return res.status(200).json({ success: true });
    }

    // If already back in lobby or playing, rematch already started — just return success
    if (room.status === 'lobby' || room.status === 'playing') {
      console.log(`🔄 Rematch already started or in progress for room [${code}]. Silently returning success.`);
      return res.status(200).json({ success: true });
    }

    if (room.status !== 'finished') {
      return res.status(400).json({ type: 'error', data: { message: 'Room not in finished state' } });
    }

    // Find the player — if not found they already left, silently succeed
    const player = room.players.find(p => p.name === playerName);
    if (!player) {
      console.log(`🔄 Rematch: player [${playerName}] not found in room [${code}] (may have left). Ignoring.`);
      return res.status(200).json({ success: true });
    }

    player.ready = true; // Reuse 'ready' flag for rematch agreement
    console.log(`🔄 Rematch: [${playerName}] ready in [${code}]`);

    const rematchStates = room.players.reduce((acc, p) => {
      acc[p.name] = p.ready;
      return acc;
    }, {});

    // If both players agreed to rematch → reset room and start new game
    if (room.players.length === 2 && room.players.every(p => p.ready)) {
      let randomLevel;
      try {
        const levelsData = await getGameLevels();
        randomLevel = levelsData[Math.floor(Math.random() * levelsData.length)];
      } catch (levelErr) {
        console.error('⚠️ Failed to get levels for rematch:', levelErr);
        return res.status(500).json({ type: 'error', data: { message: 'Failed to get levels for rematch' } });
      }

      room.level = randomLevel;
      room.status = 'lobby';
      room.startTime = null;

      room.players.forEach(p => {
        p.ready = false;
        p.arrowsLeft = randomLevel.arrows.length;
        p.status = 'playing';
        p.timeMs = null;
      });

      await setRoom(code, room);
      console.log(`🔄 Rematch! New Level [${randomLevel.id}] in room [${code}]`);

      await pusher.trigger(`room-${code}`, 'rematch_start', {
        players: room.players.map(p => p.name),
      });
    } else {
      await setRoom(code, room);
      await pusher.trigger(`room-${code}`, 'rematch_states', { rematchStates });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ rematch-request error:', err);
    return res.status(500).json({ type: 'error', data: { message: 'Internal server error' } });
  }
};
