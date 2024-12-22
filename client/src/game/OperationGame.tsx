import { useEffect, useRef, useState } from 'react';
import { WebSocketManager } from '../services/WebSocketManager';
import './OperationGame.css';

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

interface GamePiece {
    type: PieceType;
    x: number;
    y: number;
    shape: number[][];
}

interface OperationGameState {
    board: number[][];
    currentPiece: GamePiece | null;
    gameOver: boolean;
    score: number;
}

const BOARD_WIDTH = 5;
const BOARD_HEIGHT = 10;
const CRITICAL_HEIGHT = 5;
const CELL_SIZE = 40;
const GAME_SPEED = 500; // 500ms per move

interface OperationGameProps {
    wsManager: WebSocketManager;
    playerId: string;
    playerName: string;
}

export const OperationGame = ({ wsManager, playerId, playerName }: OperationGameProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const [gameState, setGameState] = useState<OperationGameState>({
        board: Array(BOARD_HEIGHT).fill(0).map(() => Array(BOARD_WIDTH).fill(0)),
        currentPiece: null,
        gameOver: false,
        score: 0
    });

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

    const handleContinue = () => {
        wsManager.sendMessage({
            type: 'finishOperation',
            score: gameState.score,
            playerId: playerId
        });
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
        const { board, currentPiece, gameOver } = gameState;

        // Clear canvas
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Calculate board position to center it
        const boardPixelWidth = BOARD_WIDTH * CELL_SIZE;
        const boardPixelHeight = BOARD_HEIGHT * CELL_SIZE;
        const offsetX = (ctx.canvas.width - boardPixelWidth) / 2;
        const offsetY = (ctx.canvas.height - boardPixelHeight) / 2;

        // Draw board background
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(offsetX, offsetY, boardPixelWidth, boardPixelHeight);

        // Draw critical line
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        const criticalY = offsetY + (BOARD_HEIGHT - CRITICAL_HEIGHT) * CELL_SIZE;
        ctx.beginPath();
        ctx.moveTo(offsetX, criticalY);
        ctx.lineTo(offsetX + boardPixelWidth, criticalY);
        ctx.stroke();

        // Draw board pieces
        board.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell === 1) {
                    ctx.fillStyle = '#4CAF50';
                    ctx.fillRect(
                        offsetX + x * CELL_SIZE,
                        offsetY + (BOARD_HEIGHT - 1 - y) * CELL_SIZE,
                        CELL_SIZE - 1,
                        CELL_SIZE - 1
                    );
                }
            });
        });

        // Draw current piece
        if (currentPiece && !gameOver) {
            ctx.fillStyle = '#4CAF50';
            currentPiece.shape.forEach((row, y) => {
                row.forEach((cell, x) => {
                    if (cell === 1) {
                        ctx.fillRect(
                            offsetX + (currentPiece.x + x) * CELL_SIZE,
                            offsetY + (BOARD_HEIGHT - 1 - (currentPiece.y - y)) * CELL_SIZE,
                            CELL_SIZE - 1,
                            CELL_SIZE - 1
                        );
                    }
                });
            });
        }
    };

    const moveDown = () => {
        setGameState(prevState => {
            if (!prevState.currentPiece || prevState.gameOver) return prevState;

            const piece = { ...prevState.currentPiece, y: prevState.currentPiece.y - 1 };

            if (checkCollision(piece, prevState.board)) {
                // Piece has landed
                const newBoard = mergePieceToBoard(prevState.currentPiece, prevState.board);
                const pieceMaxHeight = prevState.currentPiece.y + 1;

                if (pieceMaxHeight > CRITICAL_HEIGHT) {
                    // Game over
                    return {
                        ...prevState,
                        board: newBoard,
                        gameOver: true,
                        score: calculateScore(newBoard)
                    };
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
            if (!prevState.currentPiece || prevState.gameOver) return prevState;

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

    const renderLoop = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');

        if (ctx) {
            draw(ctx);
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

    return (
        <div className="operation-game-container">
            <h1>Operation</h1>
            <h2> Playing as {playerName}</h2>
            <canvas
                ref={canvasRef}
                className="operation-canvas"
                style={{ display: gameState.gameOver ? 'none' : 'block' }}
            />
            {gameState.gameOver && (
                <div className="game-over-screen">
                    <h1>Game Over</h1>
                    <p>Score: {gameState.score}%</p>
                    <button className="continue-button" onClick={handleContinue}>
                        Continue
                    </button>
                </div>
            )}
        </div>
    );
};