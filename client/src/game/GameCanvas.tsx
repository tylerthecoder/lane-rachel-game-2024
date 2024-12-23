import { useEffect, useRef, useState } from 'react';
import { GameState, createInitialGameState } from '@shared/GameState';
import { WebSocketManager } from '../services/WebSocketManager';
import { ClientGame } from '../game/ClientGame';
import { GameRenderer } from './GameRenderer';
import { OperationGame } from './OperationGame';

interface StatsDisplayProps {
    stats: GameState['stats'];
    score: number;
    playerName: string;
    players: GameState['players'];
    lives: number;
}

const StatsDisplay: React.FC<StatsDisplayProps & { shouldScale: boolean }> = ({ stats, score, playerName, players, lives, shouldScale }) => {
    return (
        <div className="absolute top-5 left-5 bg-black/80 p-5 rounded-lg border-2 border-game-green text-white min-w-[300px] shadow-[0_0_20px_rgba(76,175,80,0.2)] font-game z-10"
            style={{
                transformOrigin: 'center',
                transform: shouldScale ? 'scale(0.5) translate(-50%, -50%)' : 'none'
            }}
        >
            <h2 className="text-xl mb-2.5 text-game-green drop-shadow-lg">Score: {score}</h2>
            <div className="flex gap-1.5 justify-center my-2.5">
                {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-2xl">
                        {i < lives ? '❤️' : '🖤'}
                    </span>
                ))}
            </div>
            <p className="text-sm mb-4 opacity-80">Playing as: {playerName}</p>

            <div className="space-y-2">
                <div className="flex items-center p-2 bg-game-green/10 rounded hover:translate-x-1 hover:bg-game-green/20 transition-all border border-game-green/30">
                    <span className="text-xl mr-2.5 min-w-[25px]">🍽️</span>
                    <span className="text-xs">
                        Restaurants: {stats.restaurantsVisited.length}
                    </span>
                </div>
                <div className="flex items-center p-2 bg-game-green/10 rounded hover:translate-x-1 hover:bg-game-green/20 transition-all border border-game-green/30">
                    <span className="text-xl mr-2.5 min-w-[25px]">🦴</span>
                    <span className="text-xs">
                        Treats: {stats.treatsCollected}
                    </span>
                </div>
                <div className="flex items-center p-2 bg-game-green/10 rounded hover:translate-x-1 hover:bg-game-green/20 transition-all border border-game-green/30">
                    <span className="text-xl mr-2.5 min-w-[25px]">🚶</span>
                    <span className="text-xs">
                        Pedestrians: {stats.pedestriansHit}
                    </span>
                </div>
                <div className="flex items-center p-2 bg-game-green/10 rounded hover:translate-x-1 hover:bg-game-green/20 transition-all border border-game-green/30">
                    <span className="text-xl mr-2.5 min-w-[25px]">🕳️</span>
                    <span className="text-xs">
                        Potholes: {stats.potholesHit}
                    </span>
                </div>
            </div>

            <div className="mt-5 pt-5 border-t-2 border-game-green/30">
                <h3 className="text-base mb-4 text-game-green drop-shadow-lg">Active Players</h3>
                {players.map(player => (
                    <div key={player.id} className="flex items-center p-2 bg-game-green/10 rounded hover:translate-x-1 hover:bg-game-green/20 transition-all border border-game-green/30">
                        <span className="text-xl mr-2.5">👤</span>
                        <span className="text-xs">
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

const GameOver: React.FC<{ score: number }> = ({ score }) => {
    const handleRestart = () => {
        window.location.reload();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-game-dark p-8 rounded-lg text-center border-2 border-game-green text-white font-game">
                <h1 className="text-4xl mb-5 text-red-500">Game Over!</h1>
                <p className="text-xl mb-5">Final Score: {score}</p>
                <button
                    onClick={handleRestart}
                    className="px-8 py-4 text-lg bg-game-green text-white rounded-lg hover:bg-game-green/90 hover:scale-105 transition-all"
                >
                    Play Again
                </button>
            </div>
        </div>
    );
};

const TouchButton: React.FC<{
    direction: 'left' | 'right';
    onTouchStart: () => void;
    onTouchEnd: () => void;
}> = ({ direction, onTouchStart, onTouchEnd }) => {
    return (
        <button
            className={`absolute bottom-8 ${direction === 'left' ? 'left-8' : 'right-8'}
                w-20 h-20 rounded-full bg-black/40 border-2 border-game-green/50
                flex items-center justify-center text-4xl text-game-green/80
                active:bg-game-green/20 active:scale-95 transition-all
                backdrop-blur-sm touch-none`}
            onTouchStart={(e) => {
                e.preventDefault();
                onTouchStart();
            }}
            onTouchEnd={(e) => {
                e.preventDefault();
                onTouchEnd();
            }}
            onMouseDown={(e) => {
                e.preventDefault();
                onTouchStart();
            }}
            onMouseUp={(e) => {
                e.preventDefault();
                onTouchEnd();
            }}
            onMouseLeave={(e) => {
                e.preventDefault();
                onTouchEnd();
            }}
        >
            {direction === 'left' ? '←' : '→'}
        </button>
    );
};

const BikeView: React.FC<{
    canvasRef: React.RefObject<HTMLCanvasElement>,
    gameState: GameState,
    playerName: string,
    wsManager: WebSocketManager
}> = ({ canvasRef, gameState, playerName, wsManager }) => {
    const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
    const [shouldScale, setShouldScale] = useState(false);
    const keyStates = useRef<{ [key: string]: boolean }>({
        ArrowLeft: false,
        ArrowRight: false,
        ArrowUp: false,
        ArrowDown: false
    });

    // Function to calculate canvas size based on window width
    const calculateCanvasSize = () => {
        const aspectRatio = 1.5; // 1200/800
        const maxWidth = window.innerWidth;
        const maxHeight = window.innerHeight * 0.9; // Leave some space for stats

        // Check if we need to scale
        setShouldScale(maxWidth < 1200);

        let width = maxWidth;
        let height = width / aspectRatio;

        // If height is too tall, calculate based on height instead
        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
        }

        setCanvasSize({ width, height });
    };

    // Add resize listener
    useEffect(() => {
        calculateCanvasSize();
        const handleResize = () => {
            calculateCanvasSize();
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Setup keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return; // Ignore key repeat events

            switch (e.key) {
                case 'ArrowLeft':
                    if (!keyStates.current.ArrowLeft) {
                        keyStates.current.ArrowLeft = true;
                        wsManager.sendMessage({ type: 'moveLeft', pressed: true });
                    }
                    break;
                case 'ArrowRight':
                    if (!keyStates.current.ArrowRight) {
                        keyStates.current.ArrowRight = true;
                        wsManager.sendMessage({ type: 'moveRight', pressed: true });
                    }
                    break;
                case 'ArrowUp':
                    if (!keyStates.current.ArrowUp) {
                        keyStates.current.ArrowUp = true;
                        wsManager.sendMessage({ type: 'moveUp', pressed: true });
                    }
                    break;
                case 'ArrowDown':
                    if (!keyStates.current.ArrowDown) {
                        keyStates.current.ArrowDown = true;
                        wsManager.sendMessage({ type: 'moveDown', pressed: true });
                    }
                    break;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowLeft':
                    if (keyStates.current.ArrowLeft) {
                        keyStates.current.ArrowLeft = false;
                        wsManager.sendMessage({ type: 'moveLeft', pressed: false });
                    }
                    break;
                case 'ArrowRight':
                    if (keyStates.current.ArrowRight) {
                        keyStates.current.ArrowRight = false;
                        wsManager.sendMessage({ type: 'moveRight', pressed: false });
                    }
                    break;
                case 'ArrowUp':
                    if (keyStates.current.ArrowUp) {
                        keyStates.current.ArrowUp = false;
                        wsManager.sendMessage({ type: 'moveUp', pressed: false });
                    }
                    break;
                case 'ArrowDown':
                    if (keyStates.current.ArrowDown) {
                        keyStates.current.ArrowDown = false;
                        wsManager.sendMessage({ type: 'moveDown', pressed: false });
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Cleanup function
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);

            // Clean up any pressed keys when component unmounts
            if (keyStates.current.ArrowLeft) {
                wsManager.sendMessage({ type: 'moveLeft', pressed: false });
            }
            if (keyStates.current.ArrowRight) {
                wsManager.sendMessage({ type: 'moveRight', pressed: false });
            }
            if (keyStates.current.ArrowUp) {
                wsManager.sendMessage({ type: 'moveUp', pressed: false });
            }
            if (keyStates.current.ArrowDown) {
                wsManager.sendMessage({ type: 'moveDown', pressed: false });
            }
        };
    }, [wsManager]);

    // Update canvas size when dimensions change
    useEffect(() => {
        if (canvasRef.current) {
            canvasRef.current.width = canvasSize.width;
            canvasRef.current.height = canvasSize.height;
        }
    }, [canvasSize]);

    const handleLeftStart = () => {
        wsManager.sendMessage({ type: 'moveLeft', pressed: true });
    };

    const handleLeftEnd = () => {
        wsManager.sendMessage({ type: 'moveLeft', pressed: false });
    };

    const handleRightStart = () => {
        wsManager.sendMessage({ type: 'moveRight', pressed: true });
    };

    const handleRightEnd = () => {
        wsManager.sendMessage({ type: 'moveRight', pressed: false });
    };

    if (gameState.lives <= 0) {
        return (
            <div className="relative w-full h-screen flex flex-col items-center justify-center bg-game-dark">
                <div className="game-panel text-center">
                    <h1 className="game-title mb-8">Game Over</h1>
                    <p className="game-text mb-8">Final Score: {gameState.score}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-screen flex flex-col items-center justify-end bg-game-dark overflow-hidden">
            <StatsDisplay
                stats={gameState.stats}
                score={gameState.score}
                playerName={playerName}
                players={gameState.players}
                lives={gameState.lives}
                shouldScale={shouldScale}
            />
            <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                style={{
                    width: canvasSize.width,
                    height: canvasSize.height,
                    marginBottom: 0
                }}
            />
            <TouchButton
                direction="left"
                onTouchStart={handleLeftStart}
                onTouchEnd={handleLeftEnd}
            />
            <TouchButton
                direction="right"
                onTouchStart={handleRightStart}
                onTouchEnd={handleRightEnd}
            />
        </div>
    );
};

export const GameCanvas = ({ wsManager, playerName }: GameCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<GameRenderer | null>(null);
    const gameRef = useRef<ClientGame | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const [gameState, setGameState] = useState<GameState>(createInitialGameState());

    const isGameOver = gameState.lives <= 0;

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


            // Start render loop
            animationFrameRef.current = requestAnimationFrame(renderLoop);

            return () => {
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                }
                unsubscribe();
                gameRef.current?.stop();
                gameRef.current = null;
                rendererRef.current = null;
            };
        }
    }, [wsManager]);

    return (
        <div className="w-full h-screen bg-game-dark">
            {isGameOver ? (
                <GameOver score={gameState.score} />
            ) : currentPlayerLocation === 'bike' ? (
                <BikeView
                    canvasRef={canvasRef}
                    gameState={gameState}
                    playerName={playerName}
                    wsManager={wsManager}
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