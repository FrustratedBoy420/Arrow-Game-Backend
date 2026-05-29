const { generateUniqueRoomCode, setRoom } = require('./_lib/rooms');
const pusher = require('./_lib/pusher');
const levelsData = require('../level.json');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ type: 'error', data: { message: 'Name is required' } });
    }

    const playerName = name.trim();
    const roomCode = await generateUniqueRoomCode();
    const randomLevel = levelsData[Math.floor(Math.random() * levelsData.length)];

    const room = {
      code: roomCode,
      level: randomLevel,
      players: [{
        name: playerName,
        ready: false,
        arrowsLeft: randomLevel.arrows.length,
        status: 'playing',
        timeMs: null,
      }],
      status: 'lobby',
      startTime: null,
    };

    await setRoom(roomCode, room);
    console.log(`🏠 Room [${roomCode}] created by [${playerName}] with Level [${randomLevel.id}]`);

    return res.status(200).json({
      type: 'room_created',
      data: {
        roomCode,
        players: [playerName],
        level: randomLevel,
      },
    });
  } catch (err) {
    console.error('❌ create-room error:', err);
    return res.status(500).json({ type: 'error', data: { message: 'Internal server error' } });
  }
};
