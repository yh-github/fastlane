import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameEvent } from '../engine/gameState';

interface TurnEventsQueueProps {
  events: GameEvent[];
  onComplete: () => void;
}

export function TurnEventsQueue({ events, onComplete }: TurnEventsQueueProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!events || events.length === 0 || currentIndex >= events.length) {
    onComplete();
    return null;
  }

  const currentEvent = events[currentIndex];

  const handleNext = () => {
    if (currentIndex < events.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  // Determine styling based on event key for extra flavor
  let icon = '🔔';
  let color = '#00e5ff';
  
  if (currentEvent.key.includes('doctor')) {
    icon = '⚕️';
    color = '#e74c3c';
  } else if (currentEvent.key.includes('starvation')) {
    icon = '💀';
    color = '#c0392b';
  } else if (currentEvent.key.includes('robbery') || currentEvent.key.includes('willy')) {
    icon = '🥷';
    color = '#9b59b6';
  } else if (currentEvent.key.includes('rent')) {
    icon = '🏢';
    color = '#f39c12';
  } else if (currentEvent.key.includes('clothes')) {
    icon = '👔';
    color = '#3498db';
  } else if (currentEvent.key.includes('fired')) {
    icon = '🔥';
    color = '#e74c3c';
  } else if (currentEvent.key.includes('bonus')) {
    icon = '💰';
    color = '#2ecc71';
  }

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, insetInlineStart: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
    }}>
      <style>
        {`
          @keyframes popIn {
            0% { transform: scale(0.8); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
      <div className="modal-content" style={{
        backgroundColor: '#2c3e50', color: '#fff', padding: '40px', borderRadius: '12px',
        maxWidth: '500px', width: '90%', textAlign: 'center', border: `4px solid ${color}`,
        boxShadow: `0 0 30px ${color}66`,
        animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
      }}>
        <div style={{ fontSize: '72px', marginBottom: '20px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
          {icon}
        </div>
        
        <h2 style={{ fontSize: '24px', margin: '20px 0', lineHeight: '1.4' }}>
          {t(currentEvent.key, currentEvent.params as any) as string}
        </h2>
        
        <div style={{ marginTop: '40px' }}>
          <button onClick={handleNext} style={{
            padding: '12px 30px', fontSize: '1.2em', cursor: 'pointer',
            backgroundColor: color, color: '#000', border: 'none', borderRadius: '8px',
            fontWeight: 'bold', boxShadow: `0 0 15px ${color}`, textTransform: 'uppercase'
          }}>
            {currentIndex < events.length - 1 ? t('ui.next', 'Next') : t('ui.continue', 'Continue')}
          </button>
        </div>
        
        <div style={{ marginTop: '20px', fontSize: '14px', color: '#888' }}>
          {currentIndex + 1} / {events.length}
        </div>
      </div>
    </div>
  );
}
