import React from 'react';
import { useTranslation } from 'react-i18next';

interface GameOverScreenProps {
  playerName: string;
  turn: number;
  onPlayAgain: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ playerName, turn, onPlayAgain }) => {
  const { t } = useTranslation();
  return (
    <div className="fullscreen-overlay" style={{ background: 'rgba(10,10,26,0.9)' }}>
      <h1 className="game-over-screen__title">{t('gameOver.congrats')}</h1>
      <div className="game-over-screen__stats">
        <p><strong>{playerName}</strong> {t('gameOver.hasWon')}</p>
        <p>{t('gameOver.totalTime', { turn })}</p>
      </div>
      <button className="title-screen__btn" onClick={onPlayAgain}>
        {t('gameOver.playAgain')}
      </button>
    </div>
  );
};
