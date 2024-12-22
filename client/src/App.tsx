import { useState, useEffect, useRef } from 'react';
import './App.css'
import { GameCanvas } from './game/GameCanvas'
import { HomeScreen } from './components/HomeScreen'
import { ConnectionScreen } from './components/ConnectionScreen'
import { ConnectionStatus } from './components/ConnectionStatus'
import { WebSocketManager } from './services/WebSocketManager';

type Screen = 'home' | 'connecting' | 'game' | 'end';

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [playerName, setPlayerName] = useState<string>('');
  const wsManagerRef = useRef<WebSocketManager>(WebSocketManager.getInstance());

  useEffect(() => {
    // Connect WebSocket immediately when app loads
    wsManagerRef.current.connect();

    const wsManager = wsManagerRef.current;
    const unsubscribeGameStart = wsManager.onGameStart(() => {
      setScreen('game');
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
      unsubscribeGameStart();
      unsubscribeConnection();
      // wsManager.disconnect();
    };
  }, []);

  const handleStartGame = (name: string) => {
    setPlayerName(name);
    setScreen('connecting');
    wsManagerRef.current.sendMessage({ type: 'connect', payload: name });
  };

  const handleGameStart = () => {
    wsManagerRef.current.sendMessage({ type: 'startGame' });
  };

  const handlePlayAgain = () => {
    setScreen('home');
    wsManagerRef.current.disconnect();
    wsManagerRef.current.connect();
  };

  const renderScreen = () => {
    switch (screen) {
      case 'home':
        return <HomeScreen onStartGame={handleStartGame} />;
      case 'connecting':
        return <ConnectionScreen onStartGame={handleGameStart} />;
      case 'game':
        return <GameCanvas wsManager={wsManagerRef.current} playerName={playerName} />;
      case 'end':
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
  };

  return (
    <div className="App">
      <ConnectionStatus />
      {renderScreen()}
    </div>
  );
}

export default App;
