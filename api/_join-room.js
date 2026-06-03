const { getRoom, setRoom } = require('./_lib/rooms');
const pusher = require('./_lib/pusher');

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
      return res.status(404).json({ type: 'error', data: { message: `Room ${code} not found` } });
    }

    if (room.status !== 'lobby') {
      return res.status(400).json({ type: 'error', data: { message: 'Match has already started in this room' } });
    }

    if (room.players.length >= 2) {
      return res.status(400).json({ type: 'error', data: { message: 'Room is full (max 2 players)' } });
    }

    if (room.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
      return res.status(400).json({ type: 'error', data: { message: 'Name already taken in this room' } });
    }

    // Add joining player
    room.players.push({
      name: playerName,
      ready: false,
      arrowsLeft: room.level.arrows.length,
      status: 'playing',
      timeMs: null,
      score: 0,
    });

    await setRoom(code, room);
    console.log(`👤 Player [${playerName}] joined room [${code}]`);

    // Notify all existing players in the room that someone joined
    await pusher.trigger(`room-${code}`, 'player_joined', {
      players: room.players.map(p => p.name),
    });

    // Return full room info to the joining player
    return res.status(200).json({
      type: 'room_joined',
      data: {
        roomCode: code,
        players: room.players.map(p => p.name),
        level: room.level,
      },
    });
  } catch (err) {
    console.error('❌ join-room error:', err);
    return res.status(500).json({ type: 'error', data: { message: 'Internal server error' } });
  }
};
