import { useEffect, useRef, useState } from 'react';
import { GameState, createInitialGameState } from '@shared/types/GameState';
import { WebSocketManager } from '../services/WebSocketManager';
import { ClientGame } from '../game/ClientGame';

interface GameCanvasProps {
    wsManager: WebSocketManager;
}

export const GameCanvas = ({ wsManager }: GameCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<ClientGame | null>(null);
    const [gameState, setGameState] = useState<GameState>(createInitialGameState());

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

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
            console.log("newState", newState);
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
        <div className="canvas-wrapper">
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
            />
        </div>
    );
};