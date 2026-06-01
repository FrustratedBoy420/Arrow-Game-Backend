const redis = require('./redis');

// Room expires in Redis after 2 hours of inactivity (lobby / active game)
const ROOM_TTL_SECONDS = 60 * 60 * 2;

// Finished rooms expire quickly — 5 minutes is plenty to read results
const ROOM_FINISHED_TTL_SECONDS = 60 * 5;

/**
 * Fetch a room object from Redis by its 4-letter code.
 * Returns null if the room does not exist.
 */
async function getRoom(roomCode) {
  return await redis.get(`room:${roomCode.toUpperCase()}`);
}

/**
 * Save or update a room object in Redis.
 * Resets the 2-hour TTL on every write.
 */
async function setRoom(roomCode, roomData) {
  await redis.set(`room:${roomCode.toUpperCase()}`, roomData, { ex: ROOM_TTL_SECONDS });
}

/**
 * Save a finished/abandoned room with a short 5-minute TTL.
 * After this window the room is automatically removed from Redis.
 */
async function setRoomExpiring(roomCode, roomData) {
  await redis.set(`room:${roomCode.toUpperCase()}`, roomData, { ex: ROOM_FINISHED_TTL_SECONDS });
}

/**
 * Delete a room from Redis immediately.
 */
async function deleteRoom(roomCode) {
  await redis.del(`room:${roomCode.toUpperCase()}`);
}

/**
 * Generate a random 4-character room code using readable characters.
 * Retries until a code is found that does not already exist in Redis.
 */
async function generateUniqueRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O/0 or I/1 to avoid confusion
  let code = '';
  let attempts = 0;

  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await getRoom(code);
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  return code;
}

module.exports = { getRoom, setRoom, setRoomExpiring, deleteRoom, generateUniqueRoomCode };

