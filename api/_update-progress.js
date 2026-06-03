const { getRoom, setRoom } = require('./_lib/rooms');
const pusher = require('./_lib/pusher');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, roomCode, arrowsLeft, removedArrowId, scores, boardState } = req.body;
    if (!name || !roomCode || arrowsLeft === undefined) {
      return res.status(400).json({ type: 'error', data: { message: 'name, roomCode, arrowsLeft are required' } });
    }

    const code = roomCode.trim().toUpperCase();
    const room = await getRoom(code);

    if (!room || room.status !== 'playing') {
      // Silently ignore progress updates for non-active rooms
      return res.status(200).json({ success: true });
    }

    let redisPromise = Promise.resolve();
    const player = room.players.find(p => p.name === name.trim());
    if (player) {
      player.arrowsLeft = arrowsLeft;
      
      // Update scores in database
      if (scores && scores[player.name] !== undefined) {
        player.score = scores[player.name];
      }
      room.players.forEach(p => {
        if (scores && scores[p.name] !== undefined) {
          p.score = scores[p.name];
        }
      });
      redisPromise = setRoom(code, room);
    }

    // Broadcast to opponents in the room (all subscribers will receive it and filter themselves)
    const pusherPromise = pusher.trigger(`room-${code}`, 'opponent_progress', {
      name: name.trim(),
      arrowsLeft,
      removedArrowId,
      scores,
      boardState,
    });

    // Run Pusher trigger and database save in parallel
    await Promise.all([pusherPromise, redisPromise]);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ update-progress error:', err);
    return res.status(500).json({ type: 'error', data: { message: 'Internal server error' } });
  }
};
