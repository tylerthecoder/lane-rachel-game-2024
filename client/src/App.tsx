import { useState, useEffect, useRef } from 'react';
import './App.css'
import { GameCanvas } from './game/GameCanvas'
import { HomeScreen } from './components/HomeScreen'
import { ConnectionScreen } from './components/ConnectionScreen'
import { ConnectionStatus } from './components/ConnectionStatus'
import { WebSocketManager } from './services/WebSocketManager';
import { Snowfall } from './components/Snowfall';
import { MatchingGame } from './game/MatchingGame';

type Screen = 'home' | 'connecting' | 'game' | 'end' | 'matching';

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [playerName, setPlayerName] = useState<string>('');
  const wsManagerRef = useRef<WebSocketManager>(WebSocketManager.getInstance());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio('/Christmas In Harlem.mp3');
    audioRef.current.loop = true;

    // Check URL parameters for direct game access
    const params = new URLSearchParams(window.location.search);
    const gameParam = params.get('game');
    if (gameParam === 'matching') {
      setScreen('matching');
      setPlayerName('Debug Player');
    }

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
      // Stop audio when component unmounts
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
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

  const toggleMusic = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.log('Audio playback error:', error);
    }
  };

  const renderScreen = () => {
    switch (screen) {
      case 'home':
        return <HomeScreen onStartGame={handleStartGame} onToggleMusic={toggleMusic} isMusicPlaying={isPlaying} />;
      case 'connecting':
        return <ConnectionScreen onStartGame={handleGameStart} />;
      case 'game':
        return <GameCanvas wsManager={wsManagerRef.current} playerName={playerName} />;
      case 'matching':
        return (
          <MatchingGame
            wsManager={wsManagerRef.current}
            playerId="debug-player"
            playerName={playerName}
          />
        );
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
      <Snowfall />
      <ConnectionStatus />
      {renderScreen()}
    </div>
  );
}

export default App;
