import { useTranslation } from 'react-i18next';
import type { AppraisalDilemmaState } from '../../../engine/gameState';

interface AppraisalDilemmaModalProps {
  dilemma: AppraisalDilemmaState;
  onSelectOption: (index: number) => void;
}

export function AppraisalDilemmaModal({ dilemma, onSelectOption }: AppraisalDilemmaModalProps) {
  const { t } = useTranslation();

  return (
    <div
      className="building-modal-overlay"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px'
      }}
    >
      <div
        className="building-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, #1e293b, #0f172a)',
          padding: '24px',
          borderRadius: '12px',
          width: '620px',
          maxWidth: '95%',
          color: '#fff',
          border: '2px solid #eab308',
          boxShadow: '0 0 25px rgba(234, 179, 8, 0.3)',
          textAlign: 'center',
          animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔍 ⚖️ 🏷️</div>
        <h2 style={{ margin: '0 0 6px 0', color: '#facc15', fontSize: '1.4rem' }}>
          {t('appraisalDilemma.title', 'Appraisal Dilemma')}
        </h2>
        <div style={{ fontSize: '1rem', color: '#94a3b8', marginBottom: '20px' }}>
          {t('appraisalDilemma.subtitle', 'A customer brought in:')}{' '}
          <strong style={{ color: '#e2e8f0' }}>{dilemma.itemTitle}</strong>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}
        >
          {dilemma.options.map((opt, idx) => {
            let icon = '💵';
            let borderColor = '#22c55e';
            let rewardText = `+$${opt.cashAmount}`;

            if (opt.type === 'standing') {
              icon = '⭐';
              borderColor = '#38bdf8';
              rewardText = `+${opt.depAmount || 0} Dep`;
            } else if (opt.type === 'item') {
              icon = opt.itemType === 'spare_parts' ? '⚙️' : '🏺';
              borderColor = '#a855f7';
              rewardText = opt.itemType === 'spare_parts' ? '1x Spare Parts' : '1x Knick-Knack';
            } else if (opt.type === 'skill') {
              icon = '🔬';
              borderColor = '#f59e0b';
              rewardText = `+${opt.techSkillAmount || 0} Tech`;
            }

            return (
              <button
                key={idx}
                onClick={() => onSelectOption(idx)}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: `2px solid ${borderColor}`,
                  borderRadius: '8px',
                  padding: '16px 12px',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.12)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.04)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '2rem' }}>{icon}</div>
                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#f8fafc' }}>
                  {t(`appraisalDilemma.option_${opt.type}.title`, opt.title)}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.3', flex: 1 }}>
                  {t(`appraisalDilemma.option_${opt.type}.desc`, opt.description)}
                </div>
                <div
                  style={{
                    marginTop: '8px',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    color: borderColor,
                    background: 'rgba(0,0,0,0.3)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    width: '100%'
                  }}
                >
                  {rewardText}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
