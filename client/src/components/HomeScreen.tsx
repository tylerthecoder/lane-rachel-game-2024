import React, { useState, useEffect } from 'react';
import { WebSocketManager } from '../services/WebSocketManager';
import '../App.css';

interface HomeScreenProps {
  onStartGame: (name: string) => void;
  onToggleMusic: () => void;
  isMusicPlaying: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onStartGame, onToggleMusic, isMusicPlaying }) => {
  const [name, setName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const wsManager = WebSocketManager.getInstance();

  useEffect(() => {
    // Set initial connection state
    setIsConnected(wsManager.isConnected());

    // Subscribe to connection updates
    const unsubscribe = wsManager.onConnection((connected) => {
      setIsConnected(connected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onStartGame(name.trim());
    }
  };

  return (
    <div className="home-screen">
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={onToggleMusic}
          className="p-2 rounded-full bg-game-green hover:bg-game-green/80 transition-colors text-white"
          aria-label={isMusicPlaying ? 'Pause Music' : 'Play Music'}
        >
          {isMusicPlaying ? (
            // Pause icon
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            // Play icon
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </button>
      </div>

      <h1>Siems Christmas Adventure</h1>
      <p className="game-tagline">Work together to control a tandem bike!</p>
      <form onSubmit={handleSubmit} className="name-form">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          maxLength={20}
          required
        />
        <button type="submit" className="start-button" disabled={!isConnected}>
          {isConnected ? 'Start Game' : 'Connecting...'}
        </button>
      </form>
    </div>
  );
};