import { useEffect, useRef } from 'react';

interface Snowflake {
    x: number;
    y: number;
    speed: number;
    size: number;
    sway: number;
    swaySpeed: number;
    swayOffset: number;
}

export const Snowfall: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const snowflakesRef = useRef<Snowflake[]>([]);
    const imageRef = useRef<HTMLImageElement>();

    useEffect(() => {
        // Create snowflake image
        const img = new Image();
        img.src = '/buildings/snowflake.png';
        imageRef.current = img;

        // Initialize snowflakes
        const initSnowflakes = () => {
            const flakes: Snowflake[] = [];
            const count = Math.floor(window.innerWidth / 20); // One flake per 20px width

            for (let i = 0; i < count; i++) {
                flakes.push({
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    speed: 1 + Math.random() * 2,
                    size: 10 + Math.random() * 20,
                    sway: 0,
                    swaySpeed: 0.5 + Math.random() * 1,
                    swayOffset: Math.random() * Math.PI * 2
                });
            }
            snowflakesRef.current = flakes;
        };

        // Animation function
        const animate = () => {
            const canvas = canvasRef.current;
            if (!canvas) {
                requestAnimationFrame(animate);
                return;
            }
            const ctx = canvas.getContext('2d');
            if (!ctx || !imageRef.current?.complete) {
                requestAnimationFrame(animate);
                return;
            }

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update and draw snowflakes
            snowflakesRef.current.forEach((flake, i) => {
                // Update position
                flake.y += flake.speed;
                flake.sway = Math.sin((Date.now() / 1000 * flake.swaySpeed) + flake.swayOffset) * 2;
                flake.x += flake.sway;

                // Reset if out of bounds
                if (flake.y > canvas.height) {
                    flake.y = -20;
                    flake.x = Math.random() * canvas.width;
                }
                if (flake.x < -20) flake.x = canvas.width + 20;
                if (flake.x > canvas.width + 20) flake.x = -20;

                // Draw snowflake
                ctx.save();
                ctx.translate(flake.x, flake.y);
                ctx.rotate((Date.now() / 2000 * flake.swaySpeed) + flake.swayOffset);
                ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 1000 + i) * 0.2;
                ctx.drawImage(
                    imageRef.current!,
                    -flake.size/2,
                    -flake.size/2,
                    flake.size,
                    flake.size
                );
                ctx.restore();
            });

            requestAnimationFrame(animate);
        };

        // Handle resize
        const handleResize = () => {
            if (canvasRef.current) {
                // Set both canvas dimensions and style dimensions
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
                canvasRef.current.style.width = `${window.innerWidth}px`;
                canvasRef.current.style.height = `${window.innerHeight}px`;
                initSnowflakes();
            }
        };

        // Initial setup
        handleResize();
        window.addEventListener('resize', handleResize);
        const animationFrame = requestAnimationFrame(animate);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrame);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 1000
            }}
        />
    );
};