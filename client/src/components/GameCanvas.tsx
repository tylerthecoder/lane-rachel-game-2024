import { useEffect, useRef } from 'react';
import { Game } from '../game/Game';

interface GameCanvasProps {
    game: Game;
}

export const GameCanvas = ({ game }: GameCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        game.start(canvas);
        return () => game.stop();
    }, [game]);

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