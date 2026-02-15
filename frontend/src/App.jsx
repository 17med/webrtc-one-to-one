import { useState } from "react";
import useWebRTC from "./hooks/useWebRTC";
import VideoPlayer from "./components/VideoPlayer";
import "./App.css";

const WS_URL = "ws://localhost:8080";

function App() {
  const [roomInput, setRoomInput] = useState("");

  const {
    localStream,
    remoteStream,
    connectionState,
    roomId,
    error,
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo,
  } = useWebRTC(WS_URL);

  const audioEnabled =
    localStream?.getAudioTracks()[0]?.enabled ?? true;
  const videoEnabled =
    localStream?.getVideoTracks()[0]?.enabled ?? true;

  const handleJoin = (e) => {
    e.preventDefault();
    const room = roomInput.trim();
    if (room) joinRoom(room);
  };

  const statusText = {
    idle: "",
    joining: "Connecting…",
    waiting: "Waiting for another participant to join…",
    connected: "Connected",
    disconnected: "Peer disconnected",
  };

  return (
    <div className="app">
      <header className="header">
        <h1>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: "middle", marginRight: 8 }}>
            <path d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          WebRTC Video Call
        </h1>
        {roomId && (
          <span className="room-badge">
            Room: <strong>{roomId}</strong>
          </span>
        )}
      </header>

      {error && <div className="error-banner">{error}</div>}

      {connectionState === "idle" ? (
        <div className="join-section">
          <div className="join-card">
            <h2>Join a Room</h2>
            <p>Enter a room name to start a video call. Share the same name with another person to connect.</p>
            <form onSubmit={handleJoin} className="join-form">
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="e.g. my-room-123"
                autoFocus
                required
              />
              <button type="submit" className="btn-primary">
                Join Room
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
          {statusText[connectionState] && (
            <div className={`status-bar status-${connectionState}`}>
              {connectionState === "joining" || connectionState === "waiting" ? (
                <span className="spinner" />
              ) : null}
              {statusText[connectionState]}
            </div>
          )}

          <div className="videos">
            <VideoPlayer
              stream={localStream}
              muted={true}
              label="You"
            />
            <VideoPlayer
              stream={remoteStream}
              muted={false}
              label="Remote"
            />
          </div>

          <div className="controls">
            <button
              onClick={toggleAudio}
              className={`btn-control ${!audioEnabled ? "btn-off" : ""}`}
              title={audioEnabled ? "Mute" : "Unmute"}
            >
              {audioEnabled ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                  <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
                </svg>
              )}
            </button>

            <button
              onClick={toggleVideo}
              className={`btn-control ${!videoEnabled ? "btn-off" : ""}`}
              title={videoEnabled ? "Turn off camera" : "Turn on camera"}
            >
              {videoEnabled ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                  <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
                </svg>
              )}
            </button>

            <button onClick={leaveRoom} className="btn-control btn-leave" title="Leave call">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15.536 8.464a5 5 0 0 1 0 7.072m2.828-9.9a9 9 0 0 1 0 12.728M5.636 18.364a9 9 0 0 1 0-12.728m2.828 9.9a5 5 0 0 1 0-7.072" />
                <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2.5" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
