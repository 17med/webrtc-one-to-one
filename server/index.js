const { WebSocketServer } = require("ws");

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

// rooms: Map<roomId, Set<ws>>
const rooms = new Map();

wss.on("connection", (ws) => {
  let currentRoom = null;

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    switch (msg.type) {
      case "join": {
        const roomId = msg.roomId;
        if (!roomId) return;

        // Leave previous room if any
        if (currentRoom && rooms.has(currentRoom)) {
          rooms.get(currentRoom).delete(ws);
          if (rooms.get(currentRoom).size === 0) {
            rooms.delete(currentRoom);
          }
        }

        currentRoom = roomId;

        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Set());
        }

        const room = rooms.get(roomId);

        if (room.size >= 2) {
          ws.send(JSON.stringify({ type: "room-full" }));
          currentRoom = null;
          return;
        }

        room.add(ws);
        console.log(
          `User joined room "${roomId}" (${room.size}/2 participants)`
        );

        // Let the joiner know they're in
        ws.send(JSON.stringify({ type: "joined", roomId, count: room.size }));

        // If there are 2 people, tell the new joiner to create an offer
        if (room.size === 2) {
          ws.send(JSON.stringify({ type: "ready" }));
        }
        break;
      }

      case "offer":
      case "answer":
      case "ice-candidate": {
        // Forward to the other peer in the same room
        if (!currentRoom || !rooms.has(currentRoom)) return;
        const room = rooms.get(currentRoom);
        for (const client of room) {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify(msg));
          }
        }
        break;
      }

      case "leave": {
        handleLeave(ws, currentRoom);
        currentRoom = null;
        break;
      }
    }
  });

  ws.on("close", () => {
    handleLeave(ws, currentRoom);
  });
});

function handleLeave(ws, roomId) {
  if (!roomId || !rooms.has(roomId)) return;
  const room = rooms.get(roomId);
  room.delete(ws);

  // Notify remaining peer
  for (const client of room) {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: "peer-left" }));
    }
  }

  if (room.size === 0) {
    rooms.delete(roomId);
  }

  console.log(
    `User left room "${roomId}" (${rooms.has(roomId) ? rooms.get(roomId).size : 0} remaining)`
  );
}

console.log(`WebRTC signaling server running on ws://localhost:${PORT}`);
