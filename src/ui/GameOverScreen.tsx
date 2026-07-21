import React from 'react';
import { useTranslation } from 'react-i18next';

import type { ReplayData } from '../engine/replayTypes';

interface GameOverScreenProps {
  playerName: string;
  turn: number;
  replayData: ReplayData | null;
  onPlayAgain: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ playerName, turn, replayData, onPlayAgain }) => {
  const { t } = useTranslation();

  const handleExportReplay = () => {
    if (!replayData) return;
    const blob = new Blob([JSON.stringify(replayData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fastlane-replay-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fullscreen-overlay" style={{ background: 'rgba(10,10,26,0.9)' }}>
      <h1 className="game-over-screen__title">{t('gameOver.congrats')}</h1>
      <div className="game-over-screen__stats">
        <p><strong>{playerName}</strong> {t('gameOver.hasWon')}</p>
        <p>{t('gameOver.totalTime', { turn })}</p>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="title-screen__btn" onClick={onPlayAgain}>
          {t('gameOver.playAgain')}
        </button>
        {replayData && (
          <button className="title-screen__btn" onClick={handleExportReplay}>
            Export Replay
          </button>
        )}
      </div>
    </div>
  );
};
