const { getRoom, setRoom, setRoomExpiring, deleteRoom } = require('./_lib/rooms');
const pusher = require('./_lib/pusher');

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
      return res.status(200).json({ success: true }); // Room already gone
    }

    // Remove the leaving player
    room.players = room.players.filter(p => p.name !== playerName);
    console.log(`🔌 Player [${playerName}] left room [${code}]`);

    if (room.players.length === 0) {
      await deleteRoom(code);
      console.log(`🗑️ Room [${code}] deleted (empty)`);
    } else {
      // If game was active, remaining player wins by forfeit
      if (room.status === 'playing') {
        const remainingPlayer = room.players[0];
        remainingPlayer.status = 'won';
        remainingPlayer.timeMs = 0;
        room.status = 'finished';

        // Use short 5-minute TTL — room auto-deletes after results are seen
        await setRoomExpiring(code, room);

        await pusher.trigger(`room-${code}`, 'match_results', {
          winner: remainingPlayer.name,
          reason: 'opponent_disconnected',
          players: [
            { name: remainingPlayer.name, status: 'won', timeMs: 0, arrowsLeft: remainingPlayer.arrowsLeft },
            { name: playerName, status: 'abandoned', timeMs: null, arrowsLeft: null },
          ],
        });
      } else {
        if (req.body.terminate) {
          await deleteRoom(code);
          await pusher.trigger(`room-${code}`, 'room_terminated', {
            message: 'Lobby has been terminated due to 2-minute inactivity.'
          });
        } else {
          // In lobby — just notify remaining player
          room.players.forEach(p => { p.ready = false; });
          await setRoom(code, room);

          await pusher.trigger(`room-${code}`, 'player_left', {
            playerName,
            players: room.players.map(p => p.name),
          });

          await pusher.trigger(`room-${code}`, 'ready_states', {
            readyStates: room.players.reduce((acc, p) => {
              acc[p.name] = p.ready;
              return acc;
            }, {}),
          });
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ leave-room error:', err);
    return res.status(500).json({ type: 'error', data: { message: 'Internal server error' } });
  }
};
