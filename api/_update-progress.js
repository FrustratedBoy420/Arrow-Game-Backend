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

    if (!room.arrowOwners) {
      room.arrowOwners = {};
    }

    let isConflict = false;
    if (removedArrowId) {
      const existingOwner = room.arrowOwners[removedArrowId];
      if (existingOwner && existingOwner.toLowerCase() !== name.trim().toLowerCase()) {
        // Arrow was already claimed by another player first! Reject duplicate claim.
        isConflict = true;
        console.log(`⚠️ Conflict detected: [${name.trim()}] tried to claim arrow [${removedArrowId}] already owned by [${existingOwner}]`);
      } else {
        // Safe to claim!
        room.arrowOwners[removedArrowId] = name.trim();
      }
    }

    // Recalculate scores from server-side arrowOwners map to prevent any score drift
    const serverScores = {};
    room.players.forEach(p => {
      serverScores[p.name] = 0;
    });
    Object.values(room.arrowOwners).forEach(owner => {
      const matchedPlayer = room.players.find(p => p.name.toLowerCase() === owner.toLowerCase());
      if (matchedPlayer) {
        serverScores[matchedPlayer.name]++;
      }
    });

    // Update scores in the Redis room object
    room.players.forEach(p => {
      p.score = serverScores[p.name] || 0;
    });

    const player = room.players.find(p => p.name === name.trim());
    if (player) {
      player.arrowsLeft = arrowsLeft;
    }

    const redisPromise = setRoom(code, room);

    // Broadcast the verified ownership, scores, and conflict status
    const pusherPromise = pusher.trigger(`room-${code}`, 'opponent_progress', {
      name: name.trim(),
      arrowsLeft,
      removedArrowId,
      scores: serverScores,
      arrowOwners: room.arrowOwners,
      isConflict,
      boardState: {
        removedArrowId,
        scores: serverScores
      }
    });

    // Run Pusher trigger and database save in parallel
    await Promise.all([pusherPromise, redisPromise]);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ update-progress error:', err);
    return res.status(500).json({ type: 'error', data: { message: 'Internal server error' } });
  }
};
