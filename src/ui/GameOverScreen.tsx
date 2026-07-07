import React from 'react';

interface GameOverScreenProps {
  playerName: string;
  turn: number;
  onPlayAgain: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ playerName, turn, onPlayAgain }) => {
  return (
    <div className="fullscreen-overlay" style={{ background: 'rgba(10,10,26,0.9)' }}>
      <h1 className="game-over-screen__title">Congratulations!</h1>
      <div className="game-over-screen__stats">
        <p><strong>{playerName}</strong> has won the game!</p>
        <p>Total time: {turn} weeks</p>
      </div>
      <button className="title-screen__btn" onClick={onPlayAgain}>
        Play Again
      </button>
    </div>
  );
};
