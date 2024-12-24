interface TouchButtonProps {
    direction: 'left' | 'right';
    onTouchStart: () => void;
    onTouchEnd: () => void;
}

export const TouchButton: React.FC<TouchButtonProps> = ({ direction, onTouchStart, onTouchEnd }) => {
    return (
        <button
            className={`absolute bottom-8 ${direction === 'left' ? 'left-8' : 'right-8'}
                w-20 h-20 rounded-full bg-black/40 border-2 border-game-green/50
                flex items-center justify-center text-4xl text-game-green/80
                active:bg-game-green/20 active:scale-95 transition-all
                backdrop-blur-sm touch-none select-none`}
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
            {direction === 'left' ? '⬅️' : '➡️'}
        </button>
    );
};