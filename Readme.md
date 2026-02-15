# WebRTC One-to-One Video Call

A real-time one-to-one video calling app built with **native WebRTC APIs**. Two users join a shared room via a WebSocket signaling server and get connected peer-to-peer — no third-party video SDKs involved.

> Built for the **WebRTC One-to-One** challenge.

---

## Features

- 📹 Access user's camera & microphone
- 🔗 Peer-to-peer connection using native WebRTC (`RTCPeerConnection`)
- 📡 WebSocket-based signaling (offer/answer/ICE exchange)
- 🖥️ Displays both local and remote video streams
- 🚪 Room-based access — only users in the same room can connect
- 🔇 Mute/unmute audio & toggle camera on/off
- 🚫 No third-party video SDKs (Twilio, Daily, etc.)

---

## Tech Stack

| Layer     | Technology              |
| --------- | ----------------------- |
| Frontend  | React 19 + Vite         |
| Backend   | Node.js + `ws` library  |
| Protocol  | WebRTC (native browser) |
| Signaling | WebSocket               |

---

## Project Structure

```
webrtc/
├── server/
│   ├── index.js          # WebSocket signaling server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Main app component
│   │   ├── App.css               # Styles
│   │   ├── hooks/useWebRTC.js    # WebRTC + signaling logic
│   │   └── components/
│   │       └── VideoPlayer.jsx   # Video stream component
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── Readme
```

---

## Prerequisites

- **Node.js** v18+ installed
- A browser that supports WebRTC (Chrome, Firefox, Edge, etc.)
- Camera & microphone access

---

## How to Run

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd webrtc
```

### 2. Start the signaling server

```bash
cd server
npm install
npm start
```

The WebSocket server will start on **`ws://localhost:8080`**.

### 3. Start the frontend

Open a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

The app will be available at **`http://localhost:5173`**.

### 4. Make a call

1. Open **`http://localhost:5173`** in one browser tab
2. Open **`http://localhost:5173`** in a second tab (or another browser)
3. Type the **same room name** in both tabs (e.g. `test-room`)
4. Click **Join Room**
5. Grant camera/microphone permissions
6. You're connected! 🎉

---

## How It Works

```
User A                    Server                    User B
  │                         │                         │
  │──── join(room) ────────►│                         │
  │◄─── joined (count=1) ──│                         │
  │     (waiting...)        │                         │
  │                         │◄──── join(room) ────────│
  │                         │───── joined (count=2) ──►│
  │                         │───── ready ─────────────►│
  │                         │                         │
  │◄──── offer (SDP) ──────│◄──── offer (SDP) ───────│
  │──── answer (SDP) ──────►│──── answer (SDP) ──────►│
  │                         │                         │
  │◄─── ICE candidates ────│◄─── ICE candidates ─────│
  │──── ICE candidates ───►│──── ICE candidates ────►│
  │                         │                         │
  │◄═══════ P2P Video/Audio connected ═══════════════►│
```

1. **User A** joins a room → waits for a peer
2. **User B** joins the same room → server sends `ready`
3. **User B** creates a WebRTC **offer** and sends it via WebSocket
4. **User A** receives the offer, creates an **answer**, sends it back
5. Both exchange **ICE candidates** for NAT traversal
6. A direct **peer-to-peer** connection is established — video & audio flow directly between browsers

---

## Room Rules

- Max **2 participants** per room
- If a room is full, new joiners get a "Room is full" error
- When a peer leaves, the remaining user goes back to "waiting" state
- Only users in the **same room** exchange signaling messages

---

## Available Controls

| Button         | Action                          |
| -------------- | ------------------------------- |
| 🎤 Microphone  | Toggle mute / unmute            |
| 📷 Camera      | Toggle camera on / off          |
| 📞 Hang up     | Leave the room and end the call |
