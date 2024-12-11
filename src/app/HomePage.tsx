"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Updated import for App Router
import "./HomePage.css"; // Ensure you have this CSS file

const HomePage = () => {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const generateRoomId = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 16; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setRoomId(result);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId && username) {
      router.push(`/roomRoute?roomId=${roomId}&username=${username}`); // No changes needed here
    }
  };

  if (!isClient) {
    return null; // Render nothing on the server
  }

  return (
    <div className="container">
      <h1 className="title">CodeCollab</h1>
      <p className="subtitle">Collaborate in real-time with ease.</p>

      <form onSubmit={handleJoinRoom} className="form">
        <div className="input-group">
          <label htmlFor="roomId">Room ID:</label>
          <div className="input-container">
            <input
              id="roomId"
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter Room ID or Generate One"
              required
            />
            <button type="button" onClick={generateRoomId} className="create-room-button">
              Generate
            </button>
          </div>
        </div>
        <div className="input-group">
          <label htmlFor="username">Username:</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            required
          />
        </div>
        <button type="submit" className="join-room-button">Join Room</button>
      </form>
    </div>
  );
};

export default HomePage;
