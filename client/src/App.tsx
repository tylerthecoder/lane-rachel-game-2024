import { useState, useEffect, useRef } from 'react';
import './App.css'
import { GameCanvas } from './game/GameCanvas'
import { HomeScreen } from './components/HomeScreen'
import { ConnectionScreen } from './components/ConnectionScreen'
import { ConnectionStatus } from './components/ConnectionStatus'
import { GameState, createInitialGameState } from '@shared/GameState'
import { WebSocketManager } from './services/WebSocketManager';

function App() {
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const wsManagerRef = useRef<WebSocketManager>(WebSocketManager.getInstance());

  useEffect(() => {
    const wsManager = wsManagerRef.current;
    const unsubscribeGameState = wsManager.onGameState((newGameState) => {
      setGameState(newGameState);
    });

    const unsubscribeGameStart = wsManager.onGameStart(() => {
      setIsGameStarted(true);
      setIsConnecting(false);
    });

    const unsubscribeConnection = wsManager.onConnection((isConnected) => {
      if (!isConnected) {
        // If disconnected, try to reconnect after a short delay
        setTimeout(() => {
          if (!wsManager.isConnected()) {
            wsManager.connect();
          }
        }, 1000);
      }
    });

    return () => {
      unsubscribeGameState();
      unsubscribeGameStart();
      unsubscribeConnection();
    };
  }, []);

  const handleStartGame = () => {
    setIsConnecting(true);
    wsManagerRef.current.connect();
  };

  const handleNameSubmit = (name: string) => {
    wsManagerRef.current.sendMessage({ type: 'connect', payload: name });
  };

  const handleGameStart = () => {
    wsManagerRef.current.sendMessage({ type: 'startGame' });
  };

  const handlePlayAgain = () => {
    setGameState(createInitialGameState());
    setShowEndScreen(false);
    setIsGameStarted(false);
    setIsConnecting(false);
    wsManagerRef.current.disconnect();
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
          isConnected={wsManagerRef.current.isConnected()}
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
        <GameCanvas wsManager={wsManagerRef.current} />
      )}
    </div>
  );
}

export default App;
