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
    if (!room || room.status !== 'finished') {
      return res.status(400).json({ type: 'error', data: { message: 'Room not in finished state' } });
    }

    const player = room.players.find(p => p.name === playerName);
    if (!player) {
      return res.status(404).json({ type: 'error', data: { message: 'Player not found in room' } });
    }

    player.ready = true; // Reuse 'ready' flag for rematch agreement
    console.log(`🔄 Rematch: [${playerName}] ready in [${code}]`);

    const rematchStates = room.players.reduce((acc, p) => {
      acc[p.name] = p.ready;
      return acc;
    }, {});

    // If both players agreed to rematch → reset room and start new game
    if (room.players.length === 2 && room.players.every(p => p.ready)) {
      const levelsData = await getGameLevels();
      const randomLevel = levelsData[Math.floor(Math.random() * levelsData.length)];
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
        level: randomLevel,
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
