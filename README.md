# Arrow Escape - Multiplayer Backend

This is the WebSocket-based multiplayer server for the Arrow Escape game. It allows two players to join a private room using a room code, synchronize gameplay, track progress in real-time, and determine the winner based on completion speed.

## Features
- **Room Management**: Create or join rooms via a 4-letter alphanumeric code.
- **Random Levels**: Auto-selects a random level from the built-in level pool.
- **Real-time Progress Sync**: Broadcasts the remaining arrow counts between players during matches.
- **Winner Calculations**: Declares the winner dynamically based on the first to successfully complete the level.
- **Rematches**: Seamlessly restart matches with new random levels.
- **Local Match Logs**: Persists match logs, completion times, and winners locally in a `matches.json` file.

---

## Setup Instructions

### 1. Install Dependencies
Navigate to the `Backend` directory and install the packages:
```bash
npm install
```

### 2. Configure Environment
Make sure a `.env` file exists in the `Backend` folder containing:
```env
PORT=3000
```

### 3. Run the Server
Start the server in development mode (with auto-reload):
```bash
npm run dev
```
Or start in standard production mode:
```bash
npm start
```
The server will bind to `http://localhost:3000` and the WebSocket will run on `ws://localhost:3000`.

---

## Exposing the Server with Ngrok

To connect physical mobile devices (e.g. your phone running Expo Go) to your local server, you must expose it via a public tunnel:

### 1. Start Ngrok Tunnel
Run the following command on your local machine:
```bash
ngrok http 3000
```

### 2. Get the Tunnel URL
Ngrok will print a public address like:
```text
Forwarding     https://8a4f-122-161-51-143.ngrok-free.app -> http://localhost:3000
```

### 3. Connect from the Game
Copy the `https://...` address (change `https` to `wss` or the app will automatically handle it) and paste it into the **Server URL** input in the Multiplayer screen of the app.
- For example: `wss://8a4f-122-161-51-143.ngrok-free.app`
- If you are testing on local emulators:
  - **iOS Simulator**: `ws://localhost:3000`
  - **Android Emulator**: `ws://10.0.2.2:3000`
