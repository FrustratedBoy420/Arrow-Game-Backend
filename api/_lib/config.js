const redis = require('./redis');
const staticLevels = require('../../level.json');

/**
 * Fetch levels from Redis.
 * If not present in Redis, seed Redis with the local level.json contents and return them.
 */
async function getGameLevels() {
  try {
    const levelsStr = await redis.get('game:levels');
    if (levelsStr) {
      // If it's a string, parse it, otherwise if it's already an array/object from redis client return it
      const levels = typeof levelsStr === 'string' ? JSON.parse(levelsStr) : levelsStr;
      if (Array.isArray(levels) && levels.length > 0) {
        return levels;
      }
    }
  } catch (err) {
    console.error('⚠️ Error reading levels from Redis:', err);
  }

  // Fallback and seed
  console.log('🌱 Seeding levels to Redis from static level.json');
  try {
    await redis.set('game:levels', JSON.stringify(staticLevels));
  } catch (err) {
    console.error('⚠️ Failed to seed levels to Redis:', err);
  }
  return staticLevels;
}

/**
 * Fetch music URL configurations from Redis.
 * Returns default/null URLs if not set.
 */
async function getGameMusic() {
  const defaultMusic = {
    correct: null,
    wrong: null,
    victory: null,
    outOfMove: null,
    bgMusic: null
  };

  try {
    const musicStr = await redis.get('game:music');
    if (musicStr) {
      return typeof musicStr === 'string' ? JSON.parse(musicStr) : musicStr;
    }
  } catch (err) {
    console.error('⚠️ Error reading music from Redis:', err);
  }

  return defaultMusic;
}

/**
 * Fetch icon configurations from Redis.
 * Returns default icon settings if not set.
 */
async function getGameIcons() {
  const defaultIcons = {
    homeArrow: '➤'
  };

  try {
    const iconsStr = await redis.get('game:icons');
    if (iconsStr) {
      return typeof iconsStr === 'string' ? JSON.parse(iconsStr) : iconsStr;
    }
  } catch (err) {
    console.error('⚠️ Error reading icons from Redis:', err);
  }

  return defaultIcons;
}

/**
 * Update game configurations in Redis.
 */
async function setGameConfig(type, data) {
  if (type === 'levels') {
    if (!Array.isArray(data)) throw new Error('Levels config must be a JSON array');
    await redis.set('game:levels', JSON.stringify(data));
  } else if (type === 'music') {
    if (typeof data !== 'object' || data === null) throw new Error('Music config must be a JSON object');
    await redis.set('game:music', JSON.stringify(data));
  } else if (type === 'icons') {
    if (typeof data !== 'object' || data === null) throw new Error('Icons config must be a JSON object');
    await redis.set('game:icons', JSON.stringify(data));
  } else if (type === 'room_terminate') {
    if (typeof data !== 'string') throw new Error('Room code must be a string');
    await redis.del(`room:${data.toUpperCase()}`);
  } else {
    throw new Error(`Unknown config type: ${type}`);
  }
}

module.exports = {
  getGameLevels,
  getGameMusic,
  getGameIcons,
  setGameConfig
};
