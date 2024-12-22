import { useEffect, useRef, useState } from 'react';
import { GameState, createInitialGameState } from '@shared/GameState';
import { WebSocketManager } from '../services/WebSocketManager';
import { ClientGame } from '../game/ClientGame';
import { GameRenderer } from './GameRenderer';
import { OperationGame } from './OperationGame';
import './GameCanvas.css';

interface StatsDisplayProps {
    stats: GameState['stats'];
    score: number;
    playerName: string;
    players: GameState['players'];
}

const StatsDisplay: React.FC<StatsDisplayProps> = ({ stats, score, playerName, players }) => {
    return (
        <div className="stats-display">
            <h2>Score: {score}</h2>
            <p className="player-name">Playing as: {playerName}</p>

            <div className="stats-list">
                <div className="stat-item">
                    <span className="stat-icon">🍽️</span>
                    <span className="stat-text">
                        Restaurants: {stats.restaurantsVisited.length}
                    </span>
                </div>
                <div className="stat-item">
                    <span className="stat-icon">🦴</span>
                    <span className="stat-text">
                        Treats: {stats.treatsCollected}
                    </span>
                </div>
                <div className="stat-item">
                    <span className="stat-icon">🚶</span>
                    <span className="stat-text">
                        Pedestrians: {stats.pedestriansHit}
                    </span>
                </div>
                <div className="stat-item">
                    <span className="stat-icon">🕳️</span>
                    <span className="stat-text">
                        Potholes: {stats.potholesHit}
                    </span>
                </div>
            </div>

            <div className="players-list">
                <h3>Active Players</h3>
                {players.map(player => (
                    <div key={player.id} className="player-item">
                        <span className="player-icon">👤</span>
                        <span className="player-text">
                            {player.name}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface GameCanvasProps {
    wsManager: WebSocketManager;
    playerName: string;
}

const BikeView: React.FC<{
    canvasRef: React.RefObject<HTMLCanvasElement>,
    gameState: GameState,
    playerName: string
}> = ({ canvasRef, gameState, playerName }) => {
    return (
        <>
            <StatsDisplay
                stats={gameState.stats}
                score={gameState.score}
                playerName={playerName}
                players={gameState.players}
            />
            <canvas
                ref={canvasRef}
                width={1200}
                height={800}
                className="game-canvas"
            />
        </>
    );
};

export const GameCanvas = ({ wsManager, playerName }: GameCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<GameRenderer | null>(null);
    const gameRef = useRef<ClientGame | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const [gameState, setGameState] = useState<GameState>(createInitialGameState());

    const playerId = gameState.players.find(p => p.name === playerName)?.id;

    // Get current player's location
    const currentPlayerLocation = gameState.players.find(p => p.name === playerName)?.location || 'bike';

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
                    gameState={gameState}
                    playerName={playerName}
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