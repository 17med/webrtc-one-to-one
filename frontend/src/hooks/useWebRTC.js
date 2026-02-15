import { useRef, useState, useCallback, useEffect } from "react";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export default function useWebRTC(wsUrl) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState("idle"); // idle | joining | waiting | connected | disconnected
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  // Cleanup peer connection
  const cleanupPeer = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }
    setRemoteStream(null);
  }, []);

  // Create a new RTCPeerConnection
  const createPeerConnection = useCallback(() => {
    cleanupPeer();

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks to connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle incoming remote tracks
    const remote = new MediaStream();
    remoteStreamRef.current = remote;

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remote.addTrack(track);
      });
      setRemoteStream(new MediaStream(remote.getTracks()));
    };

    // Send ICE candidates to the other peer
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === 1) {
        wsRef.current.send(
          JSON.stringify({ type: "ice-candidate", candidate: event.candidate })
        );
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setConnectionState("connected");
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        setConnectionState("disconnected");
      }
    };

    pcRef.current = pc;
    return pc;
  }, [cleanupPeer]);

  // Handle signaling messages from WebSocket
  const handleSignalingMessage = useCallback(
    async (msg) => {
      switch (msg.type) {
        case "joined": {
          if (msg.count === 1) {
            setConnectionState("waiting");
          }
          break;
        }

        case "room-full": {
          setError("Room is full. Only 2 participants allowed.");
          setConnectionState("idle");
          break;
        }

        case "ready": {
          // We are the second person — create offer
          const pc = createPeerConnection();
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          wsRef.current.send(
            JSON.stringify({ type: "offer", sdp: pc.localDescription })
          );
          setConnectionState("connected");
          break;
        }

        case "offer": {
          // We are the first person — answer the offer
          const pc = createPeerConnection();
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          wsRef.current.send(
            JSON.stringify({ type: "answer", sdp: pc.localDescription })
          );
          setConnectionState("connected");
          break;
        }

        case "answer": {
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(
              new RTCSessionDescription(msg.sdp)
            );
          }
          break;
        }

        case "ice-candidate": {
          if (pcRef.current) {
            try {
              await pcRef.current.addIceCandidate(
                new RTCIceCandidate(msg.candidate)
              );
            } catch (e) {
              console.error("Error adding ICE candidate:", e);
            }
          }
          break;
        }

        case "peer-left": {
          cleanupPeer();
          setConnectionState("waiting");
          break;
        }
      }
    },
    [createPeerConnection, cleanupPeer]
  );

  // Start camera/mic
  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setError(null);
      return stream;
    } catch (err) {
      setError(
        "Could not access camera/microphone. Please grant permissions."
      );
      throw err;
    }
  }, []);

  // Join a room
  const joinRoom = useCallback(
    async (room) => {
      setError(null);
      setConnectionState("joining");

      try {
        // Ensure media is started
        if (!localStreamRef.current) {
          await startMedia();
        }

        // Connect WebSocket
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: "join", roomId: room }));
          setRoomId(room);
        };

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          handleSignalingMessage(msg);
        };

        ws.onerror = () => {
          setError("WebSocket connection failed. Is the server running?");
          setConnectionState("idle");
        };

        ws.onclose = () => {
          if (
            connectionState !== "idle" &&
            connectionState !== "disconnected"
          ) {
            setConnectionState("disconnected");
          }
        };
      } catch {
        setConnectionState("idle");
      }
    },
    [wsUrl, startMedia, handleSignalingMessage, connectionState]
  );

  // Leave the room
  const leaveRoom = useCallback(() => {
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: "leave" }));
      wsRef.current.close();
    }
    cleanupPeer();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState("idle");
    setRoomId("");
    setError(null);
  }, [cleanupPeer]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, [leaveRoom]);

  return {
    localStream,
    remoteStream,
    connectionState,
    roomId,
    error,
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo,
  };
}
