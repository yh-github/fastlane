import type { PlayerState, StatModification, GameRules } from '../engine/gameState';
import { useTranslation } from 'react-i18next';

interface WeekendScreenProps {
  player: PlayerState;
  turn: number;
  onStartWeek: () => void;
  rules?: GameRules;
}

export function WeekendScreen({ player, turn, onStartWeek, rules }: WeekendScreenProps) {
  const { t } = useTranslation();

  const isHelpfulUI = rules?.helpfulUI ?? true;

  const getStatInfo = (stat: string) => {
    switch (stat) {
      case 'money':
        return { icon: '$', label: t('weekendScreen.cost', { defaultValue: 'Money' }) };
      case 'mental':
        return { icon: '🧠', label: t('weekendScreen.mental', { defaultValue: 'Mental Condition' }) };
      case 'physical':
        return { icon: '💪', label: t('weekendScreen.physical', { defaultValue: 'Physical Condition' }) };
      case 'dependability':
        return { icon: '🤝', label: t('weekendScreen.dependability', { defaultValue: 'Dependability' }) };
      case 'mess':
        return { icon: '🧹', label: t('weekendScreen.mess', { defaultValue: 'Apartment Mess' }) };
      case 'social':
        return { icon: '👥', label: t('weekendScreen.social', { defaultValue: 'Social Standing' }) };
      case 'happiness':
        return { icon: '😊', label: t('weekendScreen.happiness', { defaultValue: 'Happiness' }) };
      case 'relaxation':
        return { icon: '🧘', label: t('weekendScreen.relaxation', { defaultValue: 'Relaxation' }) };
      default:
        return { icon: '', label: stat };
    }
  };

  const rawModifications: StatModification[] = (() => {
    if (player.weekendResult?.modifications && player.weekendResult.modifications.length > 0) {
      return player.weekendResult.modifications;
    }
    if (!player.weekendResult) {
      return [];
    }
    const mods: StatModification[] = [];
    if (player.weekendResult.cost > 0) {
      mods.push({ stat: 'money', diff: -player.weekendResult.cost });
    }
    if (player.weekendResult.happinessBonus) {
      if (player.mentalCondition !== undefined) {
        mods.push({ stat: 'mental', diff: player.weekendResult.happinessBonus });
      } else {
        mods.push({ stat: 'happiness', diff: player.weekendResult.happinessBonus });
      }
    }
    return mods;
  })();

  const modifications = isHelpfulUI 
    ? rawModifications 
    : rawModifications.filter(mod => mod.stat === 'money');

  return (
    <div className="weekend-screen" style={{
      position: 'absolute', top: 0, insetInlineStart: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.90)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', color: 'white', zIndex: 1000, overflowY: 'auto', padding: '40px 20px'
    }}>
      <h1 style={{ color: '#00e5ff', textShadow: '0 0 10px #00e5ff' }}>{t('weekendScreen.title')}</h1>
      <h2>{t('weekendScreen.summary', { turn, name: player.name })}</h2>
      
      <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0', width: '100%', maxWidth: '520px' }}>
        <div className="weekend-player-summary" style={{
          padding: '24px', backgroundColor: '#2c3e50', borderRadius: '12px', 
          width: '100%', border: '2px solid #34495e', textAlign: 'center',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
        }}>
          <h3 style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.2)', paddingBottom: '12px', margin: '0 0 16px 0' }}>
            {t('weekendScreen.activities')}
          </h3>
          
          {player.weekendResult ? (
            <>
              <h4 style={{ color: '#f1c40f', margin: '0 0 12px 0' }}>{t('weekendScreen.whatYouDid')}</h4>
              <p style={{ fontSize: '1.15em', fontStyle: 'italic', marginBottom: '18px', lineHeight: 1.4 }}>
                "{t(player.weekendResult.event.key, player.weekendResult.event.params as any) as string}"
              </p>

              {modifications.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                  justifyContent: 'center',
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.15)'
                }}>
                  {modifications.map((mod, idx) => {
                    const info = getStatInfo(mod.stat);
                    const isMoney = mod.stat === 'money';

                    let text = '';
                    if (isMoney) {
                      text = mod.diff < 0 ? `-$${Math.abs(mod.diff)}` : (mod.diff > 0 ? `+$${mod.diff}` : `$0`);
                    } else {
                      const sign = mod.diff > 0 ? '+' : '';
                      text = info.icon ? `${sign}${mod.diff} ${info.icon}` : `${sign}${mod.diff} ${info.label}`;
                    }

                    let isPositive = false;
                    let isNegative = false;
                    if (isMoney) {
                      if (mod.diff < 0) isNegative = true;
                      else if (mod.diff > 0) isPositive = true;
                    } else if (mod.stat === 'mess') {
                      if (mod.diff > 0) isNegative = true;
                      else if (mod.diff < 0) isPositive = true;
                    } else {
                      if (mod.diff > 0) isPositive = true;
                      else if (mod.diff < 0) isNegative = true;
                    }

                    let color = '#94a3b8';
                    let bg = 'rgba(148, 163, 184, 0.15)';
                    let border = '1px solid rgba(148, 163, 184, 0.3)';

                    if (isPositive) {
                      color = '#4ade80';
                      bg = 'rgba(74, 222, 128, 0.18)';
                      border = '1px solid rgba(74, 222, 128, 0.35)';
                    } else if (isNegative) {
                      color = mod.stat === 'mess' ? '#fb923c' : '#f87171';
                      bg = mod.stat === 'mess' ? 'rgba(251, 146, 60, 0.18)' : 'rgba(248, 113, 113, 0.18)';
                      border = mod.stat === 'mess' ? '1px solid rgba(251, 146, 60, 0.35)' : '1px solid rgba(248, 113, 113, 0.35)';
                    }

                    return (
                      <span
                        key={idx}
                        title={info.label}
                        aria-label={`${info.label}: ${text}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontWeight: 'bold',
                          fontSize: '1em',
                          color,
                          backgroundColor: bg,
                          border,
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                        }}
                      >
                        {text}
                      </span>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <p style={{ fontStyle: 'italic', color: '#aaa', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {t('weekendScreen.nothingSpecial')}
            </p>
          )}
        </div>
      </div>

      <button 
        onClick={onStartWeek}
        style={{
          padding: '10px 30px', fontSize: '1.2em', cursor: 'pointer', marginTop: '20px',
          backgroundColor: '#00e5ff', color: '#000', border: 'none', borderRadius: '4px',
          fontWeight: 'bold', boxShadow: '0 0 10px #00e5ff'
        }}
      >
        {t('weekendScreen.startWeek', { turn })}
      </button>
    </div>
  );
}
