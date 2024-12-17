import React from 'react';
import '../App.css';

interface HomeScreenProps {
  onStartGame: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onStartGame }) => {
  return (
    <div className="home-screen">
      <h1>Lane & Rachel's Tandem Bike Adventure</h1>
      <div className="game-description">
        <p>Work together to control a tandem bike and complete various missions!</p>
        <ul>
          <li>Get treats for Luna</li>
          <li>Capture 3 Pokemon</li>
          <li>Visit 3 different restaurants</li>
        </ul>
      </div>
      <button className="start-button" onClick={onStartGame}>
        Start Game
      </button>
    </div>
  );
};