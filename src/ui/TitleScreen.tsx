import React from 'react';

interface TitleScreenProps {
  onStartGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartGame }) => {
  return (
    <div className="fullscreen-overlay">
      <h1 className="title-screen__logo">Fast Lane</h1>
      <h2 className="title-screen__subtitle">Modernized</h2>
      <button className="title-screen__btn" onClick={onStartGame}>
        New Game
      </button>
    </div>
  );
};
