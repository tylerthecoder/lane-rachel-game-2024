import React, { useState, useEffect } from 'react';
import { WebSocketManager } from '../services/WebSocketManager';
import '../App.css';

interface HomeScreenProps {
  onStartGame: (name: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onStartGame }) => {
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