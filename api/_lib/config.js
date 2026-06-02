const redis = require('./redis');
const staticLevels = require('../../level.json');

// In-memory cache variables for serverless warm starts
let cachedLevels = null;
let cachedLevelsTime = 0;

let cachedMusic = null;
let cachedMusicTime = 0;

let cachedIcons = null;
let cachedIconsTime = 0;

const CACHE_TTL = 1000 * 60 * 5; // 5 minutes cache TTL

/**
 * Fetch levels from Redis.
 * If not present in Redis, seed Redis with the local level.json contents and return them.
 */
async function getGameLevels() {
  const now = Date.now();
  if (cachedLevels && (now - cachedLevelsTime) < CACHE_TTL) {
    return cachedLevels;
  }

  try {
    const levelsStr = await redis.get('game:levels');
    if (levelsStr) {
      const levels = typeof levelsStr === 'string' ? JSON.parse(levelsStr) : levelsStr;
      if (Array.isArray(levels) && levels.length > 0) {
        cachedLevels = levels;
        cachedLevelsTime = now;
        return levels;
      }
    }
  } catch (err) {
    console.error('⚠️ Error reading levels from Redis:', err);
    if (cachedLevels) {
      return cachedLevels; // Fallback to stale cache if Redis fails
    }
  }

  // Fallback and seed
  console.log('🌱 Seeding levels to Redis from static level.json');
  try {
    await redis.set('game:levels', JSON.stringify(staticLevels));
  } catch (err) {
    console.error('⚠️ Failed to seed levels to Redis:', err);
  }
  
  cachedLevels = staticLevels;
  cachedLevelsTime = now;
  return staticLevels;
}

/**
 * Fetch music URL configurations from Redis.
 * Returns default/null URLs if not set.
 */
async function getGameMusic() {
  const now = Date.now();
  if (cachedMusic && (now - cachedMusicTime) < CACHE_TTL) {
    return cachedMusic;
  }

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
      const music = typeof musicStr === 'string' ? JSON.parse(musicStr) : musicStr;
      cachedMusic = music;
      cachedMusicTime = now;
      return music;
    }
  } catch (err) {
    console.error('⚠️ Error reading music from Redis:', err);
    if (cachedMusic) return cachedMusic;
  }

  return defaultMusic;
}

/**
 * Fetch icon configurations from Redis.
 * Returns default icon settings if not set.
 */
async function getGameIcons() {
  const now = Date.now();
  if (cachedIcons && (now - cachedIconsTime) < CACHE_TTL) {
    return cachedIcons;
  }

  const defaultIcons = {
    homeArrow: '➤'
  };

  try {
    const iconsStr = await redis.get('game:icons');
    if (iconsStr) {
      const icons = typeof iconsStr === 'string' ? JSON.parse(iconsStr) : iconsStr;
      cachedIcons = icons;
      cachedIconsTime = now;
      return icons;
    }
  } catch (err) {
    console.error('⚠️ Error reading icons from Redis:', err);
    if (cachedIcons) return cachedIcons;
  }

  return defaultIcons;
}

let cachedVersion = null;
let cachedVersionTime = 0;

/**
 * Fetch version configurations from Redis.
 * Returns default v1.0.0 versions if not set.
 */
async function getGameVersion() {
  const now = Date.now();
  if (cachedVersion && (now - cachedVersionTime) < CACHE_TTL) {
    return cachedVersion;
  }

  const defaultVersion = {
    latest: '1.0.0',
    critical: '1.0.0'
  };

  try {
    const versionStr = await redis.get('game:version');
    if (versionStr) {
      const version = typeof versionStr === 'string' ? JSON.parse(versionStr) : versionStr;
      cachedVersion = version;
      cachedVersionTime = now;
      return version;
    }
  } catch (err) {
    console.error('⚠️ Error reading version from Redis:', err);
    if (cachedVersion) return cachedVersion;
  }

  return defaultVersion;
}

/**
 * Update game configurations in Redis.
 */
async function setGameConfig(type, data) {
  const now = Date.now();
  if (type === 'levels') {
    if (!Array.isArray(data)) throw new Error('Levels config must be a JSON array');
    await redis.set('game:levels', JSON.stringify(data));
    // Update local cache
    cachedLevels = data;
    cachedLevelsTime = now;
  } else if (type === 'music') {
    if (typeof data !== 'object' || data === null) throw new Error('Music config must be a JSON object');
    await redis.set('game:music', JSON.stringify(data));
    // Update local cache
    cachedMusic = data;
    cachedMusicTime = now;
  } else if (type === 'icons') {
    if (typeof data !== 'object' || data === null) throw new Error('Icons config must be a JSON object');
    await redis.set('game:icons', JSON.stringify(data));
    // Update local cache
    cachedIcons = data;
    cachedIconsTime = now;
  } else if (type === 'version') {
    if (typeof data !== 'object' || data === null) throw new Error('Version config must be a JSON object');
    await redis.set('game:version', JSON.stringify(data));
    // Update local cache
    cachedVersion = data;
    cachedVersionTime = now;
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
  getGameVersion,
  setGameConfig
};
