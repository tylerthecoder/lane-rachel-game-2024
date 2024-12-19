import React from 'react';
import { GameGoals } from '@shared/GameState';
import './GoalsPanel.css';

interface GoalsPanelProps {
  goals: GameGoals;
}

export const GoalsPanel: React.FC<GoalsPanelProps> = ({ goals }) => {
  return (
    <div className="goals-panel">
      <h2>Mission Objectives</h2>
      <div className="goal-item">
        <span className="goal-icon">
          {goals.treatsCollected >= 3 ? '✅' : '🦴'}
        </span>
        <span className="goal-text">
          Collect Luna's Treats: {goals.treatsCollected}/3
        </span>
      </div>
      <div className="goal-item">
        <span className="goal-icon">
          {goals.pokemonCaught >= 3 ? '✅' : '🎮'}
        </span>
        <span className="goal-text">
          Catch Pokemon: {goals.pokemonCaught}/3
        </span>
      </div>
      <div className="goal-item">
        <span className="goal-icon">
          {goals.restaurantsVisited.length >= 3 ? '✅' : '🍽️'}
        </span>
        <span className="goal-text">
          Visit Different Restaurants: {goals.restaurantsVisited.length}/3
        </span>
      </div>
    </div>
  );
};