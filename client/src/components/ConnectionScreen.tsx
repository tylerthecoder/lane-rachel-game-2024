import React, { useState, useEffect } from 'react';
import { GameState, createInitialGameState } from '@shared/GameState';
import { WebSocketManager } from '../services/WebSocketManager';
import './ConnectionScreen.css';

interface ConnectionScreenProps {
    onStartGame: () => void;
}

export const ConnectionScreen: React.FC<ConnectionScreenProps> = ({ onStartGame }) => {
    const [gameState, setGameState] = useState<GameState>(createInitialGameState());
    const wsManager = WebSocketManager.getInstance();

    useEffect(() => {
        // Subscribe to game state updates
        const unsubscribe = wsManager.onGameState((newState) => {
            setGameState(newState);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    return (
        <div className="connection-screen">
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