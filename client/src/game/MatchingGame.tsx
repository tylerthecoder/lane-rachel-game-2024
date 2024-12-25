import { useEffect, useState } from 'react';
import { WebSocketManager } from '../services/WebSocketManager';

interface MatchingGameProps {
    wsManager: WebSocketManager;
    playerId: string;
    playerName: string;
}

interface Card {
    id: number;
    imageUrl: string;
    isFlipped: boolean;
    isMatched: boolean;
}

type Screen = 'intro' | 'game' | 'end';

interface IntroScreenProps {
    playerName: string;
    onStart: () => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ playerName, onStart }) => {
    return (
        <div className="game-container">
            <div className="game-panel max-w-2xl mx-auto">
                <h1 className="game-title">Loyde's Matching Game!</h1>
                <h2 className="game-subtitle">Playing as: {playerName}</h2>
                <div className="space-y-4 mb-8">
                    <p className="game-text">Match the buildings to earn points!</p>
                    <h3 className="text-game-green font-game mt-6 mb-4">How to Play:</h3>
                    <ul className="space-y-2">
                        <li className="game-text text-sm">Memorize the buildings</li>
                        <li className="game-text text-sm">Click two buildings to find matches</li>
                        <li className="game-text text-sm">Each correct match earns you 10 points</li>
                        <li className="game-text text-sm">Match all buildings to win!</li>
                    </ul>
                </div>
                <button className="game-button" onClick={onStart}>
                    Start Matching
                </button>
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
                <h1 className="game-title">Matching Complete!</h1>
                <p className="game-text mb-8">Score: {score} points</p>
                <button className="game-button" onClick={onContinue}>
                    Continue
                </button>
            </div>
        </div>
    );
};

const IMAGES = [
    '/buildings/frank-1.webp',
    '/buildings/frank-2.jpg',
    '/buildings/frank-3.jpg',
    '/buildings/frank-4.jpg',
    '/buildings/frank-5.webp',
    '/buildings/frank-6.jpg',
    '/buildings/frank-7.webp',
    '/buildings/frank-8.jpg',
];

export const MatchingGame: React.FC<MatchingGameProps> = ({ wsManager, playerId, playerName }) => {
    const [currentScreen, setCurrentScreen] = useState<Screen>('intro');
    const [cards, setCards] = useState<Card[]>([]);
    const [flippedCards, setFlippedCards] = useState<number[]>([]);
    const [matchedPairs, setMatchedPairs] = useState<number>(0);
    const [score, setScore] = useState<number>(0);
    const [showingInitial, setShowingInitial] = useState<boolean>(true);
    const [revealedCards, setRevealedCards] = useState<number[]>([]);
    const [matchMessage, setMatchMessage] = useState<string>('');
    const [imagesLoaded, setImagesLoaded] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('Loading images...');

    const preloadImages = () => {
        let loadedCount = 0;
        const totalImages = IMAGES.length;

        return new Promise<void>((resolve) => {
            IMAGES.forEach((src) => {
                const img = new Image();
                img.src = src;
                img.onload = () => {
                    loadedCount++;
                    setLoadingMessage(`Loading images... ${loadedCount}/${totalImages}`);
                    if (loadedCount === totalImages) {
                        setImagesLoaded(true);
                        resolve();
                    }
                };
                img.onerror = () => {
                    loadedCount++;
                    if (loadedCount === totalImages) {
                        setImagesLoaded(true);
                        resolve();
                    }
                };
            });
        });
    };

    const initializeCards = () => {
        // Create pairs of cards
        const cardPairs = [...IMAGES, ...IMAGES].map((imageUrl, index) => ({
            id: index,
            imageUrl,
            isFlipped: true,
            isMatched: false
        }));

        // Shuffle the cards
        for (let i = cardPairs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cardPairs[i], cardPairs[j]] = [cardPairs[j], cardPairs[i]];
        }

        setCards(cardPairs);
    };

    const handleStartGame = async () => {
        setCurrentScreen('game');
        if (!imagesLoaded) {
            await preloadImages();
        }
        initializeCards();
        setShowingInitial(true);

        // Hide cards after 5 seconds
        setTimeout(() => {
            setShowingInitial(false);
            setCards(cards => cards.map(card => ({ ...card, isFlipped: false })));
        }, 5000);
    };

    const handleCardClick = (cardId: number) => {
        if (showingInitial) return;
        if (flippedCards.length === 2) return;
        if (revealedCards.includes(cardId)) return;
        if (flippedCards.includes(cardId)) return;

        const newFlippedCards = [...flippedCards, cardId];
        setFlippedCards(newFlippedCards);

        setCards(cards.map(card =>
            card.id === cardId ? { ...card, isFlipped: true } : card
        ));

        if (newFlippedCards.length === 2) {
            const [firstId, secondId] = newFlippedCards;
            const firstCard = cards.find(c => c.id === firstId);
            const secondCard = cards.find(c => c.id === secondId);

            // Add both cards to revealed cards regardless of match
            const newRevealedCards = [...revealedCards, firstId, secondId];
            setRevealedCards(newRevealedCards);

            if (firstCard?.imageUrl === secondCard?.imageUrl) {
                // Match found
                setCards(cards => cards.map(card =>
                    card.id === firstId || card.id === secondId
                        ? { ...card, isMatched: true, isFlipped: true }
                        : card
                ));
                setMatchedPairs(prev => prev + 1);
                setScore(prev => prev + 10);
                setFlippedCards([]);
                setMatchMessage('Match found! +10 points');
                setTimeout(() => setMatchMessage(''), 1000);
            } else {
                // No match, but keep cards revealed
                setCards(cards => cards.map(card =>
                    card.id === firstId || card.id === secondId
                        ? { ...card, isFlipped: true }
                        : card
                ));
                setFlippedCards([]);
                setMatchMessage('No match. Try again!');
                setTimeout(() => setMatchMessage(''), 1000);
            }

            // Check if all cards are revealed
            if (newRevealedCards.length === cards.length) {
                setCurrentScreen('end');
            }
        }
    };

    useEffect(() => {
        if (matchedPairs === IMAGES.length) {
            setCurrentScreen('end');
        }
    }, [matchedPairs]);

    const handleGameEnd = () => {
        wsManager.sendMessage({
            type: 'finishMatching',
            score,
            playerId
        });
    };

    switch (currentScreen) {
        case 'intro':
            return <IntroScreen playerName={playerName} onStart={handleStartGame} />;
        case 'end':
            return <EndScreen score={score} onContinue={handleGameEnd} />;
        case 'game':
            if (!imagesLoaded) {
                return (
                    <div className="game-container">
                        <div className="game-panel text-center">
                            <h1 className="game-title">Loading...</h1>
                            <p className="game-text mb-8">{loadingMessage}</p>
                        </div>
                    </div>
                );
            }
            return (
                <div className="game-container">
                    <h1 className="game-title">Match the Buildings!</h1>
                    <h2 className="game-subtitle">Score: {score}</h2>
                    {showingInitial && (
                        <div className="text-center mb-4 font-game text-game-green">
                            Memorize the cards! They will flip in {Math.ceil(5)} seconds...
                        </div>
                    )}
                    {matchMessage && !showingInitial && (
                        <div className={`text-center mb-4 font-game ${matchMessage.includes('Match') ? 'text-game-green' : 'text-red-500'}`}>
                            {matchMessage}
                        </div>
                    )}
                    <div className="flex justify-center w-full px-4">
                        <div
                            className="grid grid-cols-4 gap-4"
                            style={{
                                width: 'min(1000px, calc(100vw - 2rem))',
                            }}
                        >
                            {cards.map(card => (
                                <div
                                    key={card.id}
                                    onClick={() => handleCardClick(card.id)}
                                    className="aspect-square relative w-full"
                                >
                                    <div className={`
                                        absolute inset-0
                                        transition-all duration-300 transform
                                        ${card.isFlipped ? 'rotate-y-0' : 'rotate-y-180'}
                                    `}>
                                        {card.isFlipped || card.isMatched ? (
                                            <img
                                                src={card.imageUrl}
                                                alt="Puppy"
                                                className="w-full h-full object-cover rounded-lg"
                                                style={{ backfaceVisibility: 'hidden' }}
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-game-green rounded-lg" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
    }
};