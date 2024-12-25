import { useEffect, useRef, useState } from 'react';
import { WebSocketManager } from '../services/WebSocketManager';
import { TouchButton } from '../components/TouchButton';

// Tetris piece shapes
const PIECES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]]
};

type PieceType = keyof typeof PIECES;
type Screen = 'intro' | 'game' | 'end';

interface GamePiece {
    type: PieceType;
    x: number;
    y: number;
    shape: number[][];
}

interface GameState {
    board: number[][];
    currentPiece: GamePiece | null;
    score: number;
}

const BOARD_WIDTH = 5;
const BOARD_HEIGHT = 10;
const CRITICAL_HEIGHT = 5;
const GAME_SPEED = 500;
const SKIN_COLOR = '#FFB6A3';
const ARM_WIDTH = 150; // increased from 100 to 150 pixels

interface IntroScreenProps {
    playerName: string;
    onStart: () => void;
    onSkip: () => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ playerName, onStart, onSkip }) => {
    return (
        <div className="game-container">
            <div className="game-panel max-w-2xl mx-auto">
                <h1 className="game-title">Emergency Surgery!</h1>
                <h2 className="game-subtitle">Playing as: {playerName}</h2>
                <div className="space-y-4 mb-8">
                    <p className="game-text">Oh no! You hit a pedestrian!</p>
                    <p className="game-text">Quick, perform emergency surgery using this totally accurate medical simulation.</p>
                    <h3 className="text-game-green font-game mt-6 mb-4">How to Play:</h3>
                    <ul className="space-y-2">
                        <li className="game-text text-sm">Use ← and → arrow keys to move the pieces</li>
                        <li className="game-text text-sm">Fill as much of the bottom 5x5 grid as possible</li>
                        <li className="game-text text-sm">Don't let pieces stack above the red line!</li>
                    </ul>
                </div>
                <div className="flex gap-4 justify-center">
                    <button className="game-button" onClick={onStart}>
                        Start Surgery
                    </button>
                    <button
                        className="game-button !bg-gray-600 hover:!bg-gray-500"
                        onClick={onSkip}
                    >
                        Skip Surgery (50% Success)
                    </button>
                </div>
            </div>
        </div>
    );
};

interface EndScreenProps {
    score: number;
    onContinue: () => void;
}

const EndScreen: React.FC<EndScreenProps> = ({ score, onContinue }) => {
    return (
        <div className="game-container">
            <div className="game-panel text-center">
                <h1 className="game-title">Surgery Complete!</h1>
                <p className="game-text mb-8">Success Rate: {score}%</p>
                <button className="game-button" onClick={onContinue}>
                    Continue
                </button>
            </div>
        </div>
    );
};

interface GameScreenProps {
    playerName: string;
    onGameOver: (score: number) => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ playerName, onGameOver }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [gameState, setGameState] = useState<GameState>({
        board: Array(BOARD_HEIGHT).fill(0).map(() => Array(BOARD_WIDTH).fill(0)),
        currentPiece: null,
        score: 0
    });
    const leftArmCanvasRef = useRef<HTMLCanvasElement>(null);
    const rightArmCanvasRef = useRef<HTMLCanvasElement>(null);

    // Function to calculate canvas size based on window width
    const calculateCanvasSize = () => {
        const maxWidth = Math.min(window.innerWidth * 0.8, 1000); // 80% of screen width up to 1000px
        const maxHeight = window.innerHeight * 0.7; // 70% of screen height
        const cellSizeFromWidth = maxWidth / BOARD_WIDTH;
        const cellSizeFromHeight = maxHeight / BOARD_HEIGHT;
        const finalCellSize = Math.min(cellSizeFromWidth, cellSizeFromHeight);

        setCanvasSize({
            width: finalCellSize * BOARD_WIDTH,
            height: finalCellSize * BOARD_HEIGHT
        });
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

    // Update canvas size when dimensions change
    useEffect(() => {
        if (canvasRef.current) {
            canvasRef.current.width = canvasSize.width;
            canvasRef.current.height = canvasSize.height;
        }
    }, [canvasSize]);

    const createNewPiece = (): GamePiece => {
        const types = Object.keys(PIECES) as PieceType[];
        const type = types[Math.floor(Math.random() * types.length)];
        return {
            type,
            x: Math.floor((BOARD_WIDTH - PIECES[type][0].length) / 2),
            y: BOARD_HEIGHT - 1,
            shape: PIECES[type]
        };
    };

    const checkCollision = (piece: GamePiece, board: number[][], dx = 0, dy = 0): boolean => {
        return piece.shape.some((row, y) =>
            row.some((cell, x) => {
                const newX = piece.x + x + dx;
                const newY = piece.y - y + dy;
                return cell !== 0 && (
                    newX < 0 ||
                    newX >= BOARD_WIDTH ||
                    newY < 0 ||
                    (newY < BOARD_HEIGHT && board[newY][newX] !== 0)
                );
            })
        );
    };

    const mergePieceToBoard = (piece: GamePiece, board: number[][]): number[][] => {
        const newBoard = board.map(row => [...row]);
        piece.shape.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell !== 0) {
                    const boardY = piece.y - y;
                    if (boardY >= 0 && boardY < BOARD_HEIGHT) {
                        newBoard[boardY][piece.x + x] = 1;
                    }
                }
            });
        });
        return newBoard;
    };

    const calculateScore = (board: number[][]): number => {
        const filledCells = board.slice(0, CRITICAL_HEIGHT)
            .reduce((sum, row) => sum + row.filter(cell => cell === 1).length, 0);
        return Math.round((filledCells / (CRITICAL_HEIGHT * BOARD_WIDTH)) * 100);
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
        const { board, currentPiece } = gameState;

        // Clear canvas
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        const cellSize = canvasSize.width / BOARD_WIDTH;

        // Draw board background
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

        // Draw critical line
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        const criticalY = (BOARD_HEIGHT - CRITICAL_HEIGHT) * cellSize;
        ctx.beginPath();
        ctx.moveTo(0, criticalY);
        ctx.lineTo(canvasSize.width, criticalY);
        ctx.stroke();

        // Draw board pieces
        board.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell === 1) {
                    ctx.fillStyle = '#FFF';
                    ctx.fillRect(
                        x * cellSize,
                        (BOARD_HEIGHT - 1 - y) * cellSize,
                        cellSize - 1,
                        cellSize - 1
                    );
                }
            });
        });

        // Draw current piece
        if (currentPiece) {
            ctx.fillStyle = '#FFF';
            currentPiece.shape.forEach((row, y) => {
                row.forEach((cell, x) => {
                    if (cell === 1) {
                        ctx.fillRect(
                            (currentPiece.x + x) * cellSize,
                            (BOARD_HEIGHT - 1 - (currentPiece.y - y)) * cellSize,
                            cellSize - 1,
                            cellSize - 1
                        );
                    }
                });
            });
        }
    };

    const moveDown = () => {
        setGameState(prevState => {
            if (!prevState.currentPiece) return prevState;

            const piece = { ...prevState.currentPiece, y: prevState.currentPiece.y - 1 };

            if (checkCollision(piece, prevState.board)) {
                // Piece has landed
                const newBoard = mergePieceToBoard(prevState.currentPiece, prevState.board);
                const pieceMaxHeight = prevState.currentPiece.y + 1;

                if (pieceMaxHeight > CRITICAL_HEIGHT) {
                    // Game over
                    const finalScore = calculateScore(newBoard);
                    onGameOver(finalScore);
                    return prevState;
                }

                return {
                    ...prevState,
                    board: newBoard,
                    currentPiece: createNewPiece()
                };
            }

            return {
                ...prevState,
                currentPiece: piece
            };
        });
    };

    const movePiece = (dx: number) => {
        setGameState(prevState => {
            if (!prevState.currentPiece) return prevState;

            const newPiece = {
                ...prevState.currentPiece,
                x: prevState.currentPiece.x + dx
            };

            if (!checkCollision(newPiece, prevState.board)) {
                return {
                    ...prevState,
                    currentPiece: newPiece
                };
            }

            return prevState;
        });
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const updateCanvasSize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);

        // Initialize game
        setGameState(prev => ({
            ...prev,
            currentPiece: createNewPiece()
        }));

        // Setup keyboard controls
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') movePiece(-1);
            if (e.key === 'ArrowRight') movePiece(1);
        };
        window.addEventListener('keydown', handleKeyDown);

        // Setup game loop
        const gameInterval = setInterval(moveDown, GAME_SPEED);

        return () => {
            window.removeEventListener('resize', updateCanvasSize);
            window.removeEventListener('keydown', handleKeyDown);
            clearInterval(gameInterval);
        };
    }, []);

    const drawArms = () => {
        const leftCtx = leftArmCanvasRef.current?.getContext('2d');
        const rightCtx = rightArmCanvasRef.current?.getContext('2d');

        if (leftCtx && rightCtx) {
            // Clear canvases
            leftCtx.clearRect(0, 0, ARM_WIDTH, canvasSize.height);
            rightCtx.clearRect(0, 0, ARM_WIDTH, canvasSize.height);

            const armHeight = (CRITICAL_HEIGHT / BOARD_HEIGHT) * canvasSize.height;

            // Draw left arm (solid rectangle)
            leftCtx.fillStyle = SKIN_COLOR;
            leftCtx.fillRect(0, canvasSize.height - armHeight, ARM_WIDTH, armHeight);

            // Draw right hand
            rightCtx.fillStyle = SKIN_COLOR;
            // Palm
            rightCtx.fillRect(0, canvasSize.height - armHeight, ARM_WIDTH * 0.8, armHeight);
            // Fingers
            const fingerSpacing = armHeight * 0.15;
            for (let i = 0; i < 6; i++) {
                rightCtx.fillRect(
                    ARM_WIDTH * .8,
                    canvasSize.height - i * fingerSpacing,
                    100,
                    armHeight * 0.1
                );
            }
        }
    };

    const renderLoop = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');

        if (ctx) {
            draw(ctx);
            drawArms();
        }

        animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    useEffect(() => {
        animationFrameRef.current = requestAnimationFrame(renderLoop);
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [gameState]);

    const handleLeftStart = () => {
        movePiece(-1);
    };

    const handleRightStart = () => {
        movePiece(1);
    };

    return (
        <div className="game-container">
            <h1 className="game-title">Emergency Surgery</h1>
            <h2 className="game-subtitle">Playing as: {playerName}</h2>
            <div className="border-2 border-game-green rounded-lg bg-black/20 p-2">
                <div className="flex items-center justify-center gap-2">
                    <canvas
                        ref={leftArmCanvasRef}
                        width={ARM_WIDTH}
                        height={canvasSize.height}
                        style={{
                            width: ARM_WIDTH,
                            height: canvasSize.height
                        }}
                    />
                    <canvas
                        ref={canvasRef}
                        width={canvasSize.width}
                        height={canvasSize.height}
                        style={{
                            width: canvasSize.width,
                            height: canvasSize.height
                        }}
                    />
                    <canvas
                        ref={rightArmCanvasRef}
                        width={ARM_WIDTH}
                        height={canvasSize.height}
                        style={{
                            width: ARM_WIDTH * 2,
                            height: canvasSize.height
                        }}
                    />
                </div>
            </div>
            <TouchButton
                direction="left"
                onTouchStart={handleLeftStart}
                onTouchEnd={() => {}}
            />
            <TouchButton
                direction="right"
                onTouchStart={handleRightStart}
                onTouchEnd={() => {}}
            />
        </div>
    );
};

interface OperationGameProps {
    wsManager: WebSocketManager;
    playerId: string;
    playerName: string;
}

export const OperationGame: React.FC<OperationGameProps> = ({ wsManager, playerId, playerName }) => {
    const [currentScreen, setCurrentScreen] = useState<Screen>('intro');
    const [finalScore, setFinalScore] = useState(0);

    const handleStartGame = () => {
        setCurrentScreen('game');
    };

    const handleSkip = () => {
        const skipScore = 50; // 50% success rate for skipping
        setFinalScore(skipScore);
        wsManager.sendMessage({
            type: 'finishOperation',
            score: skipScore,
            playerId: playerId
        });
    };

    const handleGameOver = (score: number) => {
        setFinalScore(score);
        setCurrentScreen('end');
    };

    const handleContinue = () => {
        wsManager.sendMessage({
            type: 'finishOperation',
            score: finalScore,
            playerId: playerId
        });
    };

    switch (currentScreen) {
        case 'intro':
            return <IntroScreen
                playerName={playerName}
                onStart={handleStartGame}
                onSkip={handleSkip}
            />;
        case 'game':
            return <GameScreen playerName={playerName} onGameOver={handleGameOver} />;
        case 'end':
            return <EndScreen score={finalScore} onContinue={handleContinue} />;
    }
};