/**
 * Update DB Configuration Script for Arrow Escape Game
 *
 * This script connects directly to Upstash Redis using credentials in the `.env` file
 * and allows you to update levels, music URLs, or icons.
 *
 * How to run:
 * 1. Open your terminal in Arrow-Game-Backend
 * 2. Run: node scripts/update-db.js [levels|music|icons|status]
 */

const fs = require('fs');
const path = require('path');
const { Redis } = require('@upstash/redis');

// Helper to load env variables manually from .env file
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Error: .env file not found at:', envPath);
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      env[key] = val;
    }
  });

  return env;
}

const env = loadEnv();
const redisUrl = env.UPSTASH_REDIS_REST_URL;
const redisToken = env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  console.error('❌ Error: Upstash Redis credentials not found in .env file.');
  console.log('Ensure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.');
  process.exit(1);
}

// Initialize Redis client
const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ? args[0].toLowerCase() : 'status';

  console.log('==================================================');
  console.log('🛡️  Arrow Escape - Database Config Manager');
  console.log('==================================================\n');

  if (command === 'status') {
    await showStatus();
  } else if (command === 'music') {
    await updateMusic();
  } else if (command === 'icons') {
    await updateIcons();
  } else if (command === 'levels') {
    await updateLevels();
  } else {
    console.log('❌ Unknown command. Available commands:');
    console.log('  node scripts/update-db.js status   - View current database settings');
    console.log('  node scripts/update-db.js levels   - Upload custom levels list');
    console.log('  node scripts/update-db.js music    - Configure custom music/sound URLs');
    console.log('  node scripts/update-db.js icons    - Configure custom icon characters/URLs');
  }
}

async function showStatus() {
  console.log('📡 Fetching configuration status from Redis...\n');

  try {
    const levelsStr = await redis.get('game:levels');
    const musicStr = await redis.get('game:music');
    const iconsStr = await redis.get('game:icons');

    const levels = levelsStr ? (typeof levelsStr === 'string' ? JSON.parse(levelsStr) : levelsStr) : null;
    const music = musicStr ? (typeof musicStr === 'string' ? JSON.parse(musicStr) : musicStr) : null;
    const icons = iconsStr ? (typeof iconsStr === 'string' ? JSON.parse(iconsStr) : iconsStr) : null;

    console.log('📊 levels:');
    if (levels) {
      console.log(`  Count: ${levels.length} levels configured in DB.`);
    } else {
      console.log('  Using default (local level.json fallback).');
    }

    console.log('\n🎵 music URLs:');
    if (music) {
      console.log('  - Background Music:', music.bgMusic || 'Local Fallback');
      console.log('  - Correct Move sound:', music.correct || 'Local Fallback');
      console.log('  - Wrong Move sound:', music.wrong || 'Local Fallback');
      console.log('  - Victory sound:', music.victory || 'Local Fallback');
      console.log('  - Out of Move sound:', music.outOfMove || 'Local Fallback');
    } else {
      console.log('  Using local fallback for all audios.');
    }

    console.log('\n🎨 icons:');
    if (icons) {
      console.log('  - Home Screen Arrow icon:', icons.homeArrow || '➤');
    } else {
      console.log('  Using default settings (➤).');
    }

  } catch (err) {
    console.error('❌ Failed to fetch config status:', err);
  }
}

async function updateMusic() {
  // EDIT THESE URLS TO YOUR CUSTOM MUSIC FILES hosted online (e.g. Vercel, Firebase Storage, S3)
  const customMusic = {
    bgMusic: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Example background music URL
    correct: null, // set to your custom URL to override correct sound
    wrong: null,   // set to your custom URL to override wrong sound
    victory: null, // set to your custom URL to override victory sound
    outOfMove: null // set to your custom URL to override out of move sound
  };

  console.log('💾 Saving music URLs to Redis...');
  try {
    await redis.set('game:music', JSON.stringify(customMusic));
    console.log('✅ Music URLs saved successfully! Restart your game app to hear the change.');
  } catch (err) {
    console.error('❌ Failed to save music URLs:', err);
  }
}

async function updateIcons() {
  const customIcons = {
    homeArrow: '🏹' // Change this character or put a URL to dynamically change Home icon
  };

  console.log('💾 Saving icons config to Redis...');
  try {
    await redis.set('game:icons', JSON.stringify(customIcons));
    console.log('✅ Icons config saved successfully! Restart your game app to see the change.');
  } catch (err) {
    console.error('❌ Failed to save icons config:', err);
  }
}

async function updateLevels() {
  // By default, this reads from level.json. If you want to use a custom levels file,
  // place it at Arrow-Game-Backend/level-custom.json and uncomment the line below.
  const levelsFilePath = path.join(__dirname, '../level.json');
  // const levelsFilePath = path.join(__dirname, '../level-custom.json');

  if (!fs.existsSync(levelsFilePath)) {
    console.error('❌ Error: Levels file not found at:', levelsFilePath);
    return;
  }

  console.log(`📖 Reading levels from ${path.basename(levelsFilePath)}...`);
  try {
    const data = fs.readFileSync(levelsFilePath, 'utf8');
    const levels = JSON.parse(data);

    if (!Array.isArray(levels)) {
      console.error('❌ Error: Levels file must contain a JSON array of levels.');
      return;
    }

    console.log(`💾 Uploading ${levels.length} levels to Redis...`);
    await redis.set('game:levels', JSON.stringify(levels));
    console.log('✅ Levels uploaded successfully! Your app will load these levels automatically on startup.');
  } catch (err) {
    console.error('❌ Failed to upload levels:', err);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
