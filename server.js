require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { connectDB, logMatch } = require('./db');
const levelsData = require('./level.json');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Initialize database/logging setup
connectDB();

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', levelsCount: levelsData.length });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Room management
// Room key: roomCode
// Room value: { code, level, players: [ { name, ws, ready, arrowsLeft, status, timeMs } ], status, startTime }
const rooms = new Map();

// Map to find player/room by WebSocket instance quickly
const socketToPlayerMap = new Map();

// Helper to generate a unique room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Readable chars (no O/0, I/1)
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

// Helper to send a message to a WebSocket
function sendMessage(ws, type, data = {}) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, data }));
  }
}

// Helper to broadcast to a room
function broadcastToRoom(roomCode, type, data = {}, excludeWs = null) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.players.forEach(player => {
    if (player.ws !== excludeWs) {
      sendMessage(player.ws, type, data);
    }
  });
}

// Clean up player on leave or disconnect
function handlePlayerLeave(ws) {
  const playerInfo = socketToPlayerMap.get(ws);
  if (!playerInfo) return;

  const { roomCode, playerName } = playerInfo;
  socketToPlayerMap.delete(ws);

  const room = rooms.get(roomCode);
  if (!room) return;

  // Remove player from room
  room.players = room.players.filter(p => p.ws !== ws);
  console.log(`🔌 Player [${playerName}] left room [${roomCode}]`);

  if (room.players.length === 0) {
    // If room is empty, delete it
    rooms.delete(roomCode);
    console.log(`🗑️ Room [${roomCode}] deleted (empty)`);
  } else {
    // If the game was active, the remaining player wins by default
    if (room.status === 'playing') {
      const remainingPlayer = room.players[0];
      remainingPlayer.status = 'won';
      remainingPlayer.timeMs = 0; // Default win
      room.status = 'finished';

      const results = {
        winner: remainingPlayer.name,
        reason: 'opponent_disconnected',
        players: [
          { name: remainingPlayer.name, status: 'won', timeMs: 0, arrowsLeft: remainingPlayer.arrowsLeft },
          { name: playerName, status: 'abandoned', timeMs: null, arrowsLeft: null }
        ]
      };

      sendMessage(remainingPlayer.ws, 'match_results', results);

      // Log match results
      logMatch({
        roomCode,
        levelId: room.level.id,
        difficulty: room.level.difficulty,
        players: [
          { name: remainingPlayer.name, status: 'won', timeMs: 0 },
          { name: playerName, status: 'abandoned' }
        ],
        winner: remainingPlayer.name
      });
    } else {
      // In lobby, notify remaining player
      broadcastToRoom(roomCode, 'player_left', {
        playerName,
        players: room.players.map(p => p.name)
      });
      // Reset ready states if anyone was ready
      room.players.forEach(p => { p.ready = false; });
      broadcastToRoom(roomCode, 'ready_states', {
        readyStates: room.players.reduce((acc, p) => {
          acc[p.name] = p.ready;
          return acc;
        }, {})
      });
    }
  }
}

// WebSocket Connection Handler
wss.on('connection', (ws) => {
  console.log('🔌 New client connected');

  ws.on('message', (message) => {
    try {
      const { type, data } = JSON.parse(message);
      console.log(`✉️ Received event [${type}] with data:`, JSON.stringify(data));

      switch (type) {
        case 'create_room': {
          const { name } = data;
          if (!name) {
            sendMessage(ws, 'error', { message: 'Name is required' });
            break;
          }

          const roomCode = generateRoomCode();
          // Pick a random level from our database
          const randomLevel = levelsData[Math.floor(Math.random() * levelsData.length)];

          const room = {
            code: roomCode,
            level: randomLevel,
            players: [{
              name,
              ws,
              ready: false,
              arrowsLeft: randomLevel.arrows.length,
              status: 'playing',
              timeMs: null
            }],
            status: 'lobby',
            startTime: null
          };

          rooms.set(roomCode, room);
          socketToPlayerMap.set(ws, { roomCode, playerName: name });

          console.log(`🏠 Room [${roomCode}] created by [${name}] with Level [${randomLevel.id}]`);
          sendMessage(ws, 'room_created', {
            roomCode,
            players: [name],
            level: randomLevel
          });
          break;
        }

        case 'join_room': {
          const { name, roomCode } = data;
          if (!name || !roomCode) {
            sendMessage(ws, 'error', { message: 'Name and room code are required' });
            break;
          }

          const code = roomCode.trim().toUpperCase();
          const room = rooms.get(code);

          if (!room) {
            sendMessage(ws, 'error', { message: `Room ${code} not found` });
            break;
          }

          if (room.status !== 'lobby') {
            sendMessage(ws, 'error', { message: 'Match has already started in this room' });
            break;
          }

          if (room.players.length >= 2) {
            sendMessage(ws, 'error', { message: 'Room is full (max 2 players)' });
            break;
          }

          // Check if name is already taken
          if (room.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            sendMessage(ws, 'error', { message: 'Name already taken in this room' });
            break;
          }

          // Add player
          room.players.push({
            name,
            ws,
            ready: false,
            arrowsLeft: room.level.arrows.length,
            status: 'playing',
            timeMs: null
          });

          socketToPlayerMap.set(ws, { roomCode: code, playerName: name });
          console.log(`👤 Player [${name}] joined room [${code}]`);

          // Notify joining player
          sendMessage(ws, 'room_joined', {
            roomCode: code,
            players: room.players.map(p => p.name),
            level: room.level
          });

          // Notify other players
          broadcastToRoom(code, 'player_joined', {
            players: room.players.map(p => p.name)
          }, ws);

          break;
        }

        case 'toggle_ready': {
          const playerInfo = socketToPlayerMap.get(ws);
          if (!playerInfo) break;

          const { roomCode, playerName } = playerInfo;
          const room = rooms.get(roomCode);
          if (!room) break;

          const player = room.players.find(p => p.name === playerName);
          if (player) {
            player.ready = !player.ready;
            console.log(`Ready status: [${playerName}] is now ${player.ready ? 'READY' : 'NOT READY'}`);
          }

          // Broadcast updated ready states
          const readyStates = room.players.reduce((acc, p) => {
            acc[p.name] = p.ready;
            return acc;
          }, {});

          broadcastToRoom(roomCode, 'ready_states', { readyStates });

          // Start game if all players are ready (must be 2 players)
          if (room.players.length === 2 && room.players.every(p => p.ready)) {
            room.status = 'playing';
            console.log(`⚡ Both ready in room [${roomCode}]! Starting countdown...`);
            
            // Send countdown trigger
            broadcastToRoom(roomCode, 'start_countdown', { countdownSeconds: 5 });

            // Set game start timer
            setTimeout(() => {
              // Double check room still exists and has players
              const activeRoom = rooms.get(roomCode);
              if (activeRoom && activeRoom.status === 'playing') {
                activeRoom.startTime = Date.now();
                console.log(`🚀 Game started in room [${roomCode}]`);
                broadcastToRoom(roomCode, 'start_game');
              }
            }, 5000);
          }
          break;
        }

        case 'update_progress': {
          const playerInfo = socketToPlayerMap.get(ws);
          if (!playerInfo) break;

          const { roomCode, playerName } = playerInfo;
          const room = rooms.get(roomCode);
          if (!room || room.status !== 'playing') break;

          const player = room.players.find(p => p.name === playerName);
          if (player) {
            player.arrowsLeft = data.arrowsLeft;
            // Broadcast progress to the opponent
            broadcastToRoom(roomCode, 'opponent_progress', {
              name: playerName,
              arrowsLeft: data.arrowsLeft
            }, ws);
          }
          break;
        }

        case 'player_finished': {
          const playerInfo = socketToPlayerMap.get(ws);
          if (!playerInfo) break;

          const { roomCode, playerName } = playerInfo;
          const room = rooms.get(roomCode);
          if (!room || room.status !== 'playing') break;

          const player = room.players.find(p => p.name === playerName);
          if (!player) break;

          // Calculate time on server to prevent client cheating
          const timeMs = Date.now() - room.startTime;
          player.status = 'won';
          player.timeMs = timeMs;
          player.arrowsLeft = 0;
          console.log(`🏁 Player [${playerName}] finished in ${timeMs / 1000}s`);

          // Because this is a real-time race, the first player to complete wins.
          // We can declare them winner immediately, or wait for the other player.
          // The user's request: "winner ka faisla timing se hoga jisne pehle complete kiya".
          // Since they start at the same time, the first player to finish in real-time is the one who finished first.
          // Let's check if the opponent has already finished. If not, this player wins.
          const opponent = room.players.find(p => p.name !== playerName);
          
          if (!opponent || opponent.status === 'won' || opponent.status === 'failed') {
            // Both outcomes are finalized (e.g. opponent had already failed or somehow won, which shouldn't happen simultaneously)
            // This is a safety check.
            endMatch(roomCode);
          } else {
            // Opponent is still playing. Since this player completed first, they win!
            // We can end the match immediately to avoid the winner waiting, or notify opponent they lost.
            // Let's end the match and send results immediately to keep it fast-paced.
            endMatch(roomCode, playerName);
          }
          break;
        }

        case 'player_failed': {
          const playerInfo = socketToPlayerMap.get(ws);
          if (!playerInfo) break;

          const { roomCode, playerName } = playerInfo;
          const room = rooms.get(roomCode);
          if (!room || room.status !== 'playing') break;

          const player = room.players.find(p => p.name === playerName);
          if (!player) break;

          player.status = 'failed';
          player.timeMs = null;
          console.log(`💀 Player [${playerName}] failed (lost all lives)`);

          const opponent = room.players.find(p => p.name !== playerName);
          if (!opponent) {
            endMatch(roomCode);
          } else if (opponent.status === 'won') {
            // Opponent already completed, so they won, which is already handled.
            endMatch(roomCode, opponent.name);
          } else if (opponent.status === 'failed') {
            // Both failed! Draw/no winner.
            endMatch(roomCode, 'None');
          } else {
            // Opponent is still playing. Since this player failed, the opponent wins automatically!
            endMatch(roomCode, opponent.name);
          }
          break;
        }

        case 'rematch_request': {
          const playerInfo = socketToPlayerMap.get(ws);
          if (!playerInfo) break;

          const { roomCode, playerName } = playerInfo;
          const room = rooms.get(roomCode);
          if (!room || room.status !== 'finished') break;

          const player = room.players.find(p => p.name === playerName);
          if (player) {
            player.ready = true; // reusing ready flag for rematch agreement
            console.log(`🔄 Rematch: [${playerName}] is ready for rematch`);
          }

          // Broadcast rematch state
          const rematchStates = room.players.reduce((acc, p) => {
            acc[p.name] = p.ready;
            return acc;
          }, {});

          broadcastToRoom(roomCode, 'rematch_states', { rematchStates });

          // If both agree, reset room and select a new random level
          if (room.players.length === 2 && room.players.every(p => p.ready)) {
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

            console.log(`🔄 Rematch started! Loaded new Level [${randomLevel.id}] in room [${roomCode}]`);
            
            // Broadcast new level and return to lobby
            broadcastToRoom(roomCode, 'rematch_start', {
              level: randomLevel,
              players: room.players.map(p => p.name)
            });
          }
          break;
        }

        case 'leave_room': {
          handlePlayerLeave(ws);
          break;
        }
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      sendMessage(ws, 'error', { message: 'Invalid message format' });
    }
  });

  ws.on('close', () => {
    handlePlayerLeave(ws);
  });
});

// Helper to end a match, compute winner, log to DB and notify clients
function endMatch(roomCode, declaredWinner = null) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.status = 'finished';

  // Determine winner if not declared
  let winner = declaredWinner;
  if (!winner) {
    const wonPlayers = room.players.filter(p => p.status === 'won');
    if (wonPlayers.length === 1) {
      winner = wonPlayers[0].name;
    } else if (wonPlayers.length === 2) {
      // Compare times
      winner = wonPlayers[0].timeMs < wonPlayers[1].timeMs ? wonPlayers[0].name : wonPlayers[1].name;
    } else {
      winner = 'None';
    }
  }

  // Set lost status for the loser
  room.players.forEach(p => {
    if (p.name !== winner && p.status === 'playing') {
      p.status = 'failed'; // Or lost
    }
    // Reset ready flag to be used for rematch requests
    p.ready = false;
  });

  const results = {
    winner,
    players: room.players.map(p => ({
      name: p.name,
      status: p.status,
      timeMs: p.timeMs,
      arrowsLeft: p.arrowsLeft
    }))
  };

  console.log(`🏆 Match finished in room [${roomCode}]. Winner: [${winner}]`);
  broadcastToRoom(roomCode, 'match_results', results);

  // Log match results
  logMatch({
    roomCode,
    levelId: room.level.id,
    difficulty: room.level.difficulty,
    players: room.players.map(p => ({
      name: p.name,
      timeMs: p.timeMs || undefined,
      status: p.status === 'won' ? 'won' : 'failed'
    })),
    winner
  });
}

// Start HTTP Server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🎮 WebSocket Server active on ws://localhost:${PORT}`);
});
