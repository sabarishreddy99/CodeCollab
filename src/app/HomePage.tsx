"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import "./HomePage.css";

interface LanguageOption {
  value: string;
  label: string;
}

interface RoomData {
  roomId: string;
  language: string;
  exists: boolean;
  codeRunner: string;
  data: {
    roomId: string;
    codeRunner: string;
    bucketid: string;
    language: string;
    members: string[];
  };
}

export default function HomePage() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("node");
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const languageOptions: LanguageOption[] = [
    { value: "node", label: "JavaScript" },
    { value: "python", label: "Python" },
    { value: "cpp", label: "C++" }
  ];

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

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !username || !selectedLanguage) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const launchUrl = `https://jrur6njinc.execute-api.us-east-2.amazonaws.com/dev/login?language=${selectedLanguage}&roomId=${roomId}&userId=${username}`;
      
      const response = await fetch(launchUrl);
      
      if (!response.ok) {
        throw new Error('Failed to initialize room');
      }

      const roomData: RoomData = await response.json();

      // Encode the room data to pass via URL
      const encodedRoomData = encodeURIComponent(JSON.stringify(roomData));
      
      // Navigate to the room
      router.push(`/roomRoute?roomData=${encodedRoomData}&username=${username}`);
    } catch (error) {
      console.error('Error launching room:', error);
      setError('Failed to create room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="page-container">
      <div className="card">
        <div className="card-header">
          <h1 className="main-title">CodeCollab</h1>
          <p className="tagline">Real-time collaborative coding environment</p>
        </div>

        <form onSubmit={handleJoinRoom} className="form-container">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="roomId">Room ID</label>
            <div className="input-with-button">
              <input
                id="roomId"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter Room ID"
                required
                disabled={isLoading}
              />
              <button 
                type="button" 
                onClick={generateRoomId} 
                className="generate-btn"
                disabled={isLoading}
              >
                Generate
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="language">Programming Language</label>
            <select
              id="language"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              required
              disabled={isLoading}
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button 
            type="submit" 
            className="join-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Creating Room...
              </>
            ) : (
              'Join Room'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}