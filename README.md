# ArrowVerse-Multiplayer - Multiplayer Backend (Vercel Serverless)

This backend has been migrated from a long-running WebSocket server to **Vercel Serverless Functions**, using **Pusher Channels** for real-time events and **Upstash Redis** for storing room states.

## Architecture

- **Server Type**: Vercel Serverless Functions
- **Real-Time Connections**: Pusher Channels (WebSocket abstraction)
- **Room State Persistence**: Upstash Redis (Memory DB)
- **Game Starts Countdown**: Timestamp-based synchronized clients
- **Session Expiration**: Auto-expires and deletes room codes older than 1 hour during retrieval in Redis.
- **Inactivity Termination**: Deletes lobbies and broadcasts room termination when a player leaves after a 2-minute timeout.

---

## Setup & External Services

You will need accounts on two free external services:

1. **Pusher** (https://pusher.com)
   - Create a free account.
   - Create a channel app.
   - Get the credentials (`appId`, `key`, `secret`, `cluster`).
2. **Upstash Redis** (https://upstash.com)
   - Create a free database.
   - Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

---

## Environment Configuration

Create a `.env` file in the `Backend` directory with the following variables:

```env
# Pusher Credentials
PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=ap2

# Upstash Redis Credentials
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

---

## Local Development

You can run the backend APIs locally in two ways:

### Option A: Standard Express Server (No Vercel login required — Recommended)
We provide a local Express runner [local-server.js](file:///d:/WORK_RELATED/Arrow_Game_Full_project/Arrow-Game-Backend/local-server.js) that maps Vercel Serverless Function signatures to local Express endpoints.

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Start the local server**:
   ```bash
   node local-server.js
   ```
   This starts the backend locally at `http://localhost:3000` with cors enabled and a **10mb** payload limit for uploading custom levels.

---

### Option B: Vercel Dev CLI (Requires Vercel login)
1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```
2. **Start the Vercel local environment**:
   ```bash
   npm run dev
   ```

---

## 🔧 Database Management & Admin Panel

### 1. Web Admin Panel
Open [index.html](file:///d:/WORK_RELATED/Arrow_Game_Full_project/Admin_Panel/index.html) in your browser. Configure it to connect to your server URL (e.g. `http://localhost:3000`) and optional `Admin Secret` password.
* **Live Multiplayer**: View active matches, joined players, progress, and close lobbies.
* **Levels Manager**: Browse, add, edit (with JSON verification), and delete levels.
* **Music & Icons**: Customize background music/SFX URLs and Home Screen logos dynamically.

### 2. Local Database Script CLI
We also provide a CLI script to manage the database configs from your terminal:
* **Show DB Status**: `node scripts/update-db.js status`
* **Upload Levels**: `node scripts/update-db.js levels`
* **Update Music**: Edit custom links in [update-db.js](file:///d:/WORK_RELATED/Arrow_Game_Full_project/Arrow-Game-Backend/scripts/update-db.js#L136-L149) and run `node scripts/update-db.js music`
* **Update Icons**: `node scripts/update-db.js icons`

---

## Vercel Deployment

Deploy the backend to production on Vercel:

1. **Link your Vercel Project**:
   ```bash
   npx vercel
   ```
2. **Add Environment Variables**:
   Add the following variables in your Vercel Dashboard under **Settings > Environment Variables**:
   * `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`
   * `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
   * `ADMIN_SECRET` (A custom password of your choice to protect your Admin Panel writes)
3. **Deploy to production**:
   ```bash
   npx vercel --prod
   ```

---

## Connecting Frontend App to Backend

### A. For Local Testing
Because a physical phone or simulator cannot connect to `localhost`, you must connect using your computer's local IP address:
1. Find your computer's IP address (e.g., run `ipconfig` on Windows, check the `IPv4 Address` like `192.168.1.5`).
2. In the mobile app, go to **Multiplayer Mode**.
3. Under **Server URL**, change the URL to `http://YOUR_LOCAL_IP:3000` (e.g., `http://192.168.1.5:3000`).
4. Trigger a room creation or join once to cache the local URL in the app's AsyncStorage. On next launch, your singleplayer mode will automatically load levels and music from your local server.

### B. For Production
In the mobile app's **Multiplayer Mode**:
1. Change **Server URL** to your deployed Vercel production URL (e.g., `https://arrow-game-backend.vercel.app`).
2. Trigger room creation once to save it in AsyncStorage.
