const pusher = require('./pusher');
const { getRoom, setRoom } = require('./rooms');

/**
 * Determines the winner of a match, broadcasts results via Pusher,
 * and persists the updated room state back to Redis.
 *
 * @param {string} roomCode - The 4-letter room code.
 * @param {string|null} declaredWinner - Explicitly declare a winner by name, or null to auto-determine.
 */
async function endMatch(roomCode, declaredWinner = null) {
  const room = await getRoom(roomCode);
  if (!room) return;

  room.status = 'finished';

  // Determine winner
  let winner = declaredWinner;
  if (!winner) {
    const wonPlayers = room.players.filter(p => p.status === 'won');
    if (wonPlayers.length === 1) {
      winner = wonPlayers[0].name;
    } else if (wonPlayers.length >= 2) {
      // Edge case: both finished — compare time
      winner = wonPlayers[0].timeMs < wonPlayers[1].timeMs
        ? wonPlayers[0].name
        : wonPlayers[1].name;
    } else {
      winner = 'None';
    }
  }

  // Mark non-winners who are still 'playing' as 'failed'
  room.players.forEach(p => {
    if (p.name !== winner && p.status === 'playing') {
      p.status = 'failed';
    }
    // Reset ready flag so it can be reused for rematch
    p.ready = false;
  });

  const results = {
    winner,
    players: room.players.map(p => ({
      name: p.name,
      status: p.status,
      timeMs: p.timeMs,
      arrowsLeft: p.arrowsLeft,
    })),
  };

  console.log(`🏆 Match finished in room [${roomCode}]. Winner: [${winner}]`);

  // Broadcast results to all players via Pusher
  await pusher.trigger(`room-${roomCode}`, 'match_results', results);

  // Persist final room state
  await setRoom(roomCode, room);

  return { room, winner };
}

module.exports = { endMatch };
