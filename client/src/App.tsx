import { useState, useEffect } from 'react';
import './App.css'
import { GameCanvas } from './components/GameCanvas'
import { HomeScreen } from './components/HomeScreen'
import { ConnectionScreen } from './components/ConnectionScreen'
import { ConnectionStatus } from './components/ConnectionStatus'
import { GoalsPanel } from './components/GoalsPanel'
import { GameState, createInitialGameState } from '@shared/types/GameState'
import { WebSocketManager } from './services/WebSocketManager';

function App() {
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const wsManager = WebSocketManager.getInstance();

  useEffect(() => {
    const unsubscribeGameState = wsManager.onGameState((newGameState) => {
      setGameState(newGameState);
    });

    const unsubscribeGameStart = wsManager.onGameStart(() => {
      setIsGameStarted(true);
      setIsConnecting(false);
    });

    return () => {
      unsubscribeGameState();
      unsubscribeGameStart();
    };
  }, []);

  const handleStartGame = () => {
    setIsConnecting(true);
    wsManager.connect();
  };

  const handleNameSubmit = (name: string) => {
    wsManager.sendMessage({ type: 'connect', payload: name });
  };

  const handleGameStart = () => {
    wsManager.sendMessage({ type: 'startGame' });
  };

  const handlePlayAgain = () => {
    setGameState(createInitialGameState());
    setShowEndScreen(false);
    setIsGameStarted(false);
    setIsConnecting(false);
    wsManager.disconnect();
  };

  useEffect(() => {
    if (gameState.goals.isComplete) {
      setShowEndScreen(true);
    }
  }, [gameState.goals.isComplete]);

  if (showEndScreen) {
    return (
      <div className="App">
        <ConnectionStatus />
        <div className="end-screen">
          <h1>Congratulations!</h1>
          <p>You've completed all objectives!</p>
          <button className="start-button" onClick={handlePlayAgain}>
            Play Again
          </button>
        </div>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="App">
        <ConnectionStatus />
        <ConnectionScreen
          onNameSubmit={handleNameSubmit}
          gameState={gameState}
          isConnected={wsManager.isConnected()}
          onStartGame={handleGameStart}
        />
      </div>
    );
  }

  return (
    <div className="App">
      <ConnectionStatus />
      {!isGameStarted ? (
        <HomeScreen onStartGame={handleStartGame} />
      ) : (
        <>
          <GameCanvas wsManager={wsManager} />
          <GoalsPanel goals={gameState.goals} />
        </>
      )}
    </div>
  );
}

export default App;
