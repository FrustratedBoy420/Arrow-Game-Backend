# Arrow Escape - Multiplayer Backend (Vercel Serverless)

This backend has been migrated from a long-running WebSocket server to **Vercel Serverless Functions**, using **Pusher Channels** for real-time events and **Upstash Redis** for storing room states.

## Architecture

- **Server Type**: Vercel Serverless Functions
- **Real-Time Connections**: Pusher Channels (WebSocket abstraction)
- **Room State Persistence**: Upstash Redis (Memory DB)
- **Game Starts Countdown**: Timestamp-based synchronized clients

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

To run and test the serverless backend locally:

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```
2. **Install project dependencies**:
   ```bash
   npm install
   ```
3. **Start the local server**:
   ```bash
   npm run dev
   ```
   This starts the Vercel local dev server at `http://localhost:3000`. You can test endpoints (like `http://localhost:3000/api/health`).

---

## Vercel Deployment

Deploy the backend to production on Vercel:

1. **Log in to Vercel**:
   ```bash
   vercel login
   ```
2. **Link and deploy**:
   ```bash
   vercel
   ```
3. **Add environment variables**:
   Set the `.env` values in the Vercel Project Dashboard under Settings > Environment Variables.
4. **Deploy to production**:
   ```bash
   npm run deploy
   ```

---

## Connecting Frontend to Backend

In the mobile app's **Battle Arena** setup screen:
1. Paste your deployed Vercel URL in **Server URL** (e.g. `https://your-app.vercel.app`).
2. Paste your Pusher Key in **Pusher App Key** (e.g. `your_pusher_key`).
3. Press **Create Room** or **Join Room**!
