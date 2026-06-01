const { getRoom, setRoom } = require('./_lib/rooms');
const pusher = require('./_lib/pusher');

const COUNTDOWN_SECONDS = 5;

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, roomCode } = req.body;
    if (!name || !roomCode) {
      return res.status(400).json({ type: 'error', data: { message: 'Name and room code are required' } });
    }

    const playerName = name.trim();
    const code = roomCode.trim().toUpperCase();

    const room = await getRoom(code);
    if (!room) {
      return res.status(404).json({ type: 'error', data: { message: 'Room not found' } });
    }

    const player = room.players.find(p => p.name === playerName);
    if (!player) {
      return res.status(404).json({ type: 'error', data: { message: 'Player not found in room' } });
    }

    // Toggle the player's ready state
    player.ready = !player.ready;
    console.log(`Ready: [${playerName}] is now ${player.ready ? 'READY' : 'NOT READY'} in [${code}]`);

    const readyStates = room.players.reduce((acc, p) => {
      acc[p.name] = p.ready;
      return acc;
    }, {});

    // If all 2 players are ready → start countdown
    if (room.players.length === 2 && room.players.every(p => p.ready)) {
      room.status = 'playing';
      // Store the exact timestamp when the game will start (after countdown)
      const gameStartsAt = Date.now() + COUNTDOWN_SECONDS * 1000;
      room.startTime = gameStartsAt;

      await setRoom(code, room);

      console.log(`⚡ Both ready in room [${code}]! Game starts at ${new Date(gameStartsAt).toISOString()}`);

      // Broadcast countdown with exact start timestamp so clients can sync
      await pusher.trigger(`room-${code}`, 'start_countdown', {
        countdownSeconds: COUNTDOWN_SECONDS,
        gameStartsAt, // Unix ms timestamp — clients start game at this moment
      });
    } else {
      await setRoom(code, room);
      // Broadcast updated ready states
      await pusher.trigger(`room-${code}`, 'ready_states', { readyStates });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ toggle-ready error:', err);
    return res.status(500).json({ type: 'error', data: { message: 'Internal server error' } });
  }
};
