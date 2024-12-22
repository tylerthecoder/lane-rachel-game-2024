import { useEffect, useRef, useState } from 'react';
import { GameState, createInitialGameState } from '@shared/GameState';
import { WebSocketManager } from '../services/WebSocketManager';
import { ClientGame } from '../game/ClientGame';
import { GameRenderer } from './GameRenderer';
import { GoalsPanel } from '../components/GoalsPanel';
import { OperationGame } from './OperationGame';
import './GameCanvas.css';

interface PlayerPanelProps {
    players: GameState['players'];
}

interface ScoreDisplayProps {
    score: number;
    playerName: string;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, playerName }) => {
    return (
        <div className="score-display">
            <h2>Score: {score}</h2>
            <p className="player-name">Playing as: {playerName}</p>
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
    playerName: string;
}

const BikeView: React.FC<{
    canvasRef: React.RefObject<HTMLCanvasElement>,
    score: number,
    playerName: string,
    players: GameState['players'],
    goals: GameState['goals']
}> = ({ canvasRef, score, playerName, players, goals }) => {
    return (
        <>
            <ScoreDisplay score={score} playerName={playerName} />
            <canvas
                ref={canvasRef}
                width={1200}
                height={800}
                className="game-canvas"
            />
            <PlayerPanel players={players} />
            <GoalsPanel goals={goals} />
        </>
    );
};

export const GameCanvas = ({ wsManager, playerName }: GameCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<GameRenderer | null>(null);
    const gameRef = useRef<ClientGame | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const [gameState, setGameState] = useState<GameState>(createInitialGameState());
    const [uiState, setUiState] = useState({
        score: 0,
        players: [] as GameState['players'],
        goals: gameState.goals
    });

    const playerId = gameState.players.find(p => p.name === playerName)?.id;

    // Get current player's location
    const currentPlayerLocation = gameState.players.find(p => p.name === playerName)?.location || 'bike';

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

    const renderLoop = () => {
        // Only render bike view if player is on bike
        if (currentPlayerLocation === 'bike' && gameRef.current && rendererRef.current) {
            if (canvasRef.current) {
                rendererRef.current.updateCanvas(canvasRef.current);
            }
            rendererRef.current.render(gameRef.current.getGameState());
        }


        animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    useEffect(() => {
        // Only setup canvas and renderer if player is on bike
        if (currentPlayerLocation === 'bike') {
            const canvas = canvasRef.current;
            if (!canvas) return;

            // Set canvas dimensions
            canvas.width = 1200;
            canvas.height = 800;

            // Initialize renderer
            rendererRef.current = new GameRenderer(canvas);

            // Initialize game
            if (!gameRef.current) {
                gameRef.current = new ClientGame(gameState, wsManager);
                gameRef.current.start(); // Start the game update loop
            }

            // Subscribe to game state updates
            const unsubscribe = wsManager.onGameState((newState) => {
                console.log("ServerGameState", newState);
                setGameState(newState);
                gameRef.current?.updateGameState(newState);
            });

            // Setup controls
            const cleanup = gameRef.current.setupControls();

            // Start render loop
            animationFrameRef.current = requestAnimationFrame(renderLoop);

            return () => {
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                }
                cleanup();
                unsubscribe();
                gameRef.current?.stop();
                gameRef.current = null;
                rendererRef.current = null;
            };
        }
    }, [wsManager]);

    return (
        <div className="game-container">
            {currentPlayerLocation === 'bike' ? (
                <BikeView
                    canvasRef={canvasRef}
                    score={uiState.score}
                    playerName={playerName}
                    players={uiState.players}
                    goals={uiState.goals}
                />
            ) : (
                <OperationGame
                    wsManager={wsManager}
                    playerId={playerId ?? ""}
                    playerName={playerName}
                />
            )}
        </div>
    );
};