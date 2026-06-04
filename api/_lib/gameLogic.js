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
    // If scores are recorded, compare scores first (Shared Board Mode)
    const p1 = room.players[0];
    const p2 = room.players[1];
    if (p1 && p2 && (p1.score !== undefined || p2.score !== undefined)) {
      const s1 = p1.score || 0;
      const s2 = p2.score || 0;
      if (s1 > s2) {
        winner = p1.name;
      } else if (s2 > s1) {
        winner = p2.name;
      } else {
        winner = 'None'; // Draw
      }
    } else {
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
  }

  // Mark winner as 'won' and playing non-winners as 'failed'
  room.players.forEach(p => {
    if (p.name === winner) {
      p.status = 'won';
    } else if (p.status === 'playing') {
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
      score: p.score || 0,
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
