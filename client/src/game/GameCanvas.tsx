import { useState, useEffect, useRef } from 'react';
import { WebSocketManager } from '../services/WebSocketManager';
import { OperationGame } from './OperationGame';
import { BikeView } from './BikeView';
import { MatchingGame } from './MatchingGame';

interface GameCanvasProps {
    wsManager: WebSocketManager;
    playerName: string;
}

const GameMessage: React.FC<{ text: string }> = ({ text }) => {
    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-black/80 text-white px-6 py-3 rounded-lg border border-game-green font-game text-lg">
                {text}
            </div>
        </div>
    );
};

const GameOver: React.FC<{ score: number }> = ({ score }) => {
    return (
        <div className="relative w-full h-screen flex flex-col items-center justify-center bg-game-dark">
            <div className="game-panel text-center">
                <h1 className="game-title mb-8">Game Over</h1>
                <p className="game-text mb-8">Final Score: {score}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="game-button"
                >
                    Play Again
                </button>
            </div>
        </div>
    );
};

export const GameCanvas = ({ wsManager, playerName }: GameCanvasProps) => {
    const [currentLocation, setCurrentLocation] = useState<string>('bike');
    const [isGameOver, setIsGameOver] = useState(false);
    const [finalScore, setFinalScore] = useState(0);
    const [playerId, setPlayerId] = useState<string>("");
    const [message, setMessage] = useState<{ text: string; timestamp: number } | null>(null);
    const lastMessageTimestampRef = useRef<number>(0);

    // Subscribe to game state updates for location tracking and game over state
    useEffect(() => {
        const unsubscribe = wsManager.onGameState((newState) => {
            // Update player location
            const player = newState.players.find(p => p.name === playerName);
            if (player) {
                setCurrentLocation(player.location || 'bike');
                setPlayerId(player.id);
            }

            // Check for game over
            if (newState.lives <= 0) {
                setIsGameOver(true);
                setFinalScore(newState.score);
            }

            // Update message only if it's newer than our last shown message
            if (newState.message && newState.message.timestamp > lastMessageTimestampRef.current) {
                setMessage(newState.message);
                lastMessageTimestampRef.current = newState.message.timestamp;
            }
        });
        return () => {unsubscribe();}
    }, [wsManager, playerName]);

    // Handle message timeout
    useEffect(() => {
        if (message) {
            const timeout = setTimeout(() => {
                setMessage(null);
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [message]);

    // Show game over screen if lives are depleted
    if (isGameOver) {
        return <GameOver score={finalScore} />;
    }

    return (
        <div className="w-full h-screen bg-game-dark">
            {message && <GameMessage text={message.text} />}
            {currentLocation === 'bike' ? (
                <BikeView
                    playerName={playerName}
                    wsManager={wsManager}
                />
            ) : currentLocation === 'operation-minigame' ? (
                <OperationGame
                    wsManager={wsManager}
                    playerId={playerId}
                    playerName={playerName}
                />
            ) : (
                <MatchingGame
                    wsManager={wsManager}
                    playerId={playerId}
                    playerName={playerName}
                />
            )}
        </div>
    );
};