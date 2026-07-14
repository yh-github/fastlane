import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAvailableCampaigns } from '../engine/dataLoader';

interface TitleScreenProps {
  onStartGame: (campaignId: string) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartGame }) => {
  const { t, i18n } = useTranslation();
  const campaigns = getAvailableCampaigns();
  const defaultCampaign = campaigns.find(c => c.id === 'qol_improved') || campaigns[0];
  const [selectedCampaignId, setSelectedCampaignId] = useState(defaultCampaign.id);

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId) || campaigns[0];

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
      
      <div style={{ marginBottom: '20px' }}>
        <select 
          value={selectedCampaignId} 
          onChange={(e) => setSelectedCampaignId(e.target.value)}
          style={{ padding: '10px', fontSize: '16px', borderRadius: '4px', background: '#333', color: 'white', border: '2px solid white', width: '300px' }}
        >
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '30px', maxWidth: '600px', textAlign: 'center', minHeight: '60px' }}>
        <p style={{ fontSize: '18px', color: '#ccc', fontStyle: 'italic' }}>
          {selectedCampaign.description}
        </p>
      </div>

      <button className="title-screen__btn" onClick={() => onStartGame(selectedCampaignId)}>
        {t('titleScreen.startGame')}
      </button>
    </div>
  );
};
