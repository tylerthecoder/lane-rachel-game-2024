import { useMemo, useState, useEffect } from 'react';
import './App.css'
import { GameCanvas } from './components/GameCanvas'
import { HomeScreen } from './components/HomeScreen'
import { GoalsPanel } from './components/GoalsPanel'
import { Game } from './game/Game'

function App() {
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [, forceUpdate] = useState({});
  const game = useMemo(() => new Game(), []);

  useEffect(() => {
    game.setGoalsUpdateCallback(() => {
      forceUpdate({});
    });
  }, [game]);

  useEffect(() => {
    const checkGameCompletion = () => {
      if (game.goals.isComplete) {
        setShowEndScreen(true);
      }
    };

    const interval = setInterval(checkGameCompletion, 1000);
    return () => clearInterval(interval);
  }, [game]);

  const handleStartGame = () => {
    setIsGameStarted(true);
  };

  const handlePlayAgain = () => {
    // Reset game state
    game.goals.treatsCollected = 0;
    game.goals.pokemonCaught = 0;
    game.goals.restaurantsVisited.clear();
    game.goals.isComplete = false;
    setShowEndScreen(false);
  };

  if (showEndScreen) {
    return (
      <div className="end-screen">
        <h1>Congratulations!</h1>
        <p>You've completed all objectives!</p>
        <button className="start-button" onClick={handlePlayAgain}>
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="App">
      {!isGameStarted ? (
        <HomeScreen onStartGame={handleStartGame} />
      ) : (
        <>
          <GameCanvas game={game} />
          <GoalsPanel goals={game.goals} />
        </>
      )}
    </div>
  )
}

export default App
