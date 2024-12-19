import { useEffect, useRef, useState } from 'react';
import { GameState, createInitialGameState } from '@shared/GameState';
import { WebSocketManager } from '../services/WebSocketManager';
import { ClientGame } from '../game/ClientGame';
import { GoalsPanel } from '../components/GoalsPanel';
import './GameCanvas.css';

interface PlayerPanelProps {
    players: GameState['players'];
}

interface ScoreDisplayProps {
    score: number;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score }) => {
    return (
        <div className="score-display">
            <h2>Score: {score}</h2>
        </div>
    );
};

const PlayerPanel: React.FC<PlayerPanelProps> = ({ players }) => {
    return (
        <div className="player-panel">
            <h2>Active Players</h2>
            {players.map(player => (
                <div key={player.id} className="player-item">
                    <span className="player-icon">👤</span>
                    <span className="player-text">
                        {player.name}
                        <span className="player-status">
                            {player.isReady ? ' (Ready)' : ' (Not Ready)'}
                        </span>
                    </span>
                </div>
            ))}
        </div>
    );
};

interface GameCanvasProps {
    wsManager: WebSocketManager;
}

export const GameCanvas = ({ wsManager }: GameCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<ClientGame | null>(null);
    const [gameState, setGameState] = useState<GameState>(createInitialGameState());
    const [uiState, setUiState] = useState({ score: 0, players: [] as GameState['players'], goals: gameState.goals });

    // Update UI state at 10Hz
    useEffect(() => {
        const interval = setInterval(() => {
            if (gameRef.current) {
                const currentState = gameRef.current.getGameState();
                setUiState({
                    score: currentState.score,
                    players: currentState.players,
                    goals: currentState.goals
                });
            }
        }, 100); // 10 times per second

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set canvas dimensions
        canvas.width = 1200;
        canvas.height = 800;

        // Initialize game if not already done
        if (!gameRef.current) {
            gameRef.current = new ClientGame(canvas, gameState, wsManager);
        }

        // Start game if not already started
        if (gameRef.current && !gameRef.current.isGameStarted()) {
            gameRef.current.start();
        }

        // Subscribe to game state updates
        const unsubscribe = wsManager.onGameState((newState) => {
            console.log("Server Game State", newState);
            setGameState(newState);
            gameRef.current?.updateGameState(newState);
        });

        // Setup controls
        const cleanup = gameRef.current.setupControls();

        return () => {
            cleanup();
            unsubscribe();
            gameRef.current?.stop();
        };
    }, [wsManager]);

    return (
        <div className="game-container">
            <ScoreDisplay score={uiState.score} />
            <canvas
                ref={canvasRef}
                className="game-canvas"
            />
            <PlayerPanel players={uiState.players} />
            <GoalsPanel goals={uiState.goals} />
        </div>
    );
};