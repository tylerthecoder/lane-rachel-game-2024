import React, { useState } from 'react';
import { GameState } from '@shared/types/GameState';
import './ConnectionScreen.css';

interface ConnectionScreenProps {
    onNameSubmit: (name: string) => void;
    gameState: GameState;
    isConnected: boolean;
    onStartGame: () => void;
}

export const ConnectionScreen: React.FC<ConnectionScreenProps> = ({ onNameSubmit, gameState, isConnected, onStartGame }) => {
    const [name, setName] = useState('');
    const [hasSubmitted, setHasSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            setHasSubmitted(true);
            onNameSubmit(name.trim());
        }
    };

    if (!hasSubmitted) {
        return (
            <div className="connection-screen">
                <h2>Enter Your Name</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        maxLength={20}
                        required
                    />
                    <button type="submit">Join Game</button>
                </form>
            </div>
        );
    }

    return (
        <div className="connection-screen">
            <div className={`connection-status ${isConnected ? 'connected' : 'connecting'}`}>
                {isConnected ? '🟢 Connected' : '🟡 Connecting...'}
            </div>

            <div className="players-list">
                <h3>Players in Lobby</h3>
                <div className="player-items">
                    {gameState.players?.map(player => (
                        <div key={player.id} className="player-item">
                            <span className="player-name">{player.name}</span>
                            <span className="player-status">
                                {player.isReady ? '✅ Ready' : '⏳ Waiting'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="lobby-status">
                <p>
                    {gameState.players?.length === 0
                        ? 'Waiting for connection...'
                        : 'Ready to start!'}
                </p>
                <p className="mode-info">
                    Playing in {gameState.players?.length > 1 ? 'multiplayer' : 'single-player'} mode
                </p>
            </div>

            {gameState.players?.length > 0 && (
                <button onClick={onStartGame} className="start-game-button">
                    Start Game
                </button>
            )}
        </div>
    );
};