import React from 'react';
import { useTranslation } from 'react-i18next';

interface TitleScreenProps {
  onStartGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartGame }) => {
  const { t, i18n } = useTranslation();

  return (
    <div className="fullscreen-overlay">
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <select 
          value={i18n.language} 
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          style={{ padding: '5px', fontSize: '16px' }}
        >
          <option value="en">English</option>
          <option value="he">עברית</option>
        </select>
      </div>
      <h1 className="title-screen__logo">Fast Lane</h1>
      <h2 className="title-screen__subtitle">{t('titleScreen.subtitle')}</h2>
      <button className="title-screen__btn" onClick={onStartGame}>
        {t('titleScreen.startGame')}
      </button>
    </div>
  );
};
