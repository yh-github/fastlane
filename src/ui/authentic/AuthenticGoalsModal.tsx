import React, { useState, useEffect, useMemo } from 'react';
import type { PlayerState, GameRules } from '../../engine/gameState';
import type { CampaignBundle } from '../../engine/dataLoader';
import { calcCareerProgress } from '../../engine/statMath';

interface AuthenticGoalsModalProps {
  players: PlayerState[];
  activePlayerIndex?: number;
  campaign?: CampaignBundle;
  rules?: GameRules;
  onClose: () => void;
  onOpenStatus?: () => void;
  initialSelectedPlayer?: number;
}

export const AuthenticGoalsModal: React.FC<AuthenticGoalsModalProps> = ({
  players,
  activePlayerIndex = 0,
  campaign: _campaign,
  rules: _rules,
  onClose,
  onOpenStatus,
  initialSelectedPlayer
}) => {
  const [detailedPlayerIdx, setDetailedPlayerIdx] = useState<number | null>(
    initialSelectedPlayer !== undefined ? initialSelectedPlayer : null
  );

  const basePath = '/assets/authentic/status';

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (detailedPlayerIdx !== null) {
          setDetailedPlayerIdx(null);
        } else {
          onClose();
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        onOpenStatus?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detailedPlayerIdx, onClose, onOpenStatus]);

  // Compute victory percentages matching Sierra proc_000c
  const playerStats = useMemo(() => {
    return players.slice(0, 4).map((p, pIdx) => {
      const goals = p.goalAllotment || {};
      const monGoal = goals.wealth ?? 50;
      const hapGoal = goals.happiness ?? goals.lifestyle ?? 50;
      const eduGoal = goals.education ?? 50;
      const carGoal = goals.career ?? 50;

      // Current stats
      const monStat = (p.money || 0) + (p.bankSavings || 0);
      const hapStat = p.happiness ?? p.lifestyle ?? 0;
      const eduStat = (p.degrees?.length || 0) * 25;
      const carStat = p.dependability ? calcCareerProgress(p.dependability, !!p.currentJobId) : 0;

      const sumTarget = monGoal + hapGoal + eduGoal + carGoal;
      const sumAchieved = Math.min(monStat, monGoal) +
        Math.min(hapStat, hapGoal) +
        Math.min(eduStat, eduGoal) +
        Math.min(carStat, carGoal);

      const percent = sumTarget > 0 ? Math.min(100, Math.floor((sumAchieved * 100) / sumTarget)) : 0;
      const thermCel = Math.min(10, Math.floor(percent / 10));
      const fineCel = Math.min(4, Math.floor((percent % 10) / 2));

      return {
        player: p,
        playerIndex: pIdx,
        monStat,
        monGoal,
        hapStat,
        hapGoal,
        eduStat,
        eduGoal,
        carStat,
        carGoal,
        sumAchieved,
        sumTarget,
        percent,
        thermCel,
        fineCel,
      };
    });
  }, [players]);

  // Dynamic Horizontal Offsets from Sierra script.238 lines 337-467
  // Base 4-player badge positions: 18, 62, 106, 150
  const columnOffset = useMemo(() => {
    const count = Math.min(4, Math.max(1, players.length));
    if (count === 1) return 65; // 0x41
    if (count === 2) return 42; // 0x2a
    if (count === 3) return 21; // 0x15
    return 0;
  }, [players.length]);

  const baseBadgeLefts = [18, 62, 106, 150];

  const selectedPlayerStats = detailedPlayerIdx !== null ? playerStats[detailedPlayerIdx] : null;

  return (
    <div
      className="building-modal building-modal--authentic building-modal--curved"
      data-testid="goals-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        imageRendering: 'pixelated',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 183x112 Native Resolution Viewport Scaled Pixelated */}
      <div
        style={{
          width: '183px',
          height: '112px',
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%) scale(calc(var(--board-scale, 1) * 3.75))',
          transformOrigin: 'center center',
          imageRendering: 'pixelated',
          userSelect: 'none',
        }}
      >
        {/* Background Card */}
        <img
          src={`${basePath}/${detailedPlayerIdx !== null ? 'bg_detailed_goals.png' : 'bg_goals.png'}`}
          alt="Goals Background"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '183px',
            height: '112px',
            imageRendering: 'pixelated',
            pointerEvents: 'none',
          }}
        />

        {/* Top Header Buttons (Status Switch) */}
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: '12px',
            right: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          {onOpenStatus && (
            <button
              onClick={onOpenStatus}
              data-testid="btn-switch-to-status"
              style={{
                background: '#005500',
                color: '#ffffff',
                border: '1px solid #ffffff',
                fontSize: '6px',
                lineHeight: '7px',
                padding: '1px 4px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                textTransform: 'uppercase',
              }}
              title="View Status / Inventory Screen (F4)"
            >
              📊 Status
            </button>
          )}

          {detailedPlayerIdx !== null && (
            <button
              onClick={() => setDetailedPlayerIdx(null)}
              data-testid="btn-back-to-thermometers"
              style={{
                background: '#aa5500',
                color: '#ffffff',
                border: '1px solid #aaaaaa',
                fontSize: '6px',
                lineHeight: '7px',
                padding: '1px 4px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                marginLeft: 'auto',
              }}
            >
              ◀ All Players
            </button>
          )}
        </div>

        {/* VIEW 1: Overview 4-Thermometers Display */}
        {detailedPlayerIdx === null ? (
          <div data-testid="goals-thermometers-view">
            {playerStats.map((stat, idx) => {
              const badgeLeft = baseBadgeLefts[idx] + columnOffset;
              const thermLeft = badgeLeft + 3;
              const fineLeft = thermLeft + 1;
              const fineTop = 83 - (stat.thermCel * 5);

              return (
                <div key={stat.player.id ? `${stat.player.id}-${idx}` : idx}>
                  {/* Percentage Text: nsTop 25 ($19) */}
                  <div
                    data-testid={`goals-percent-${idx}`}
                    style={{
                      position: 'absolute',
                      left: `${badgeLeft - 4}px`,
                      top: '25px',
                      width: '23px',
                      textAlign: 'center',
                      fontFamily: '"Courier New", Courier, monospace',
                      fontSize: '7px',
                      fontWeight: 'bold',
                      color: stat.playerIndex === activePlayerIndex ? '#ffff00' : '#000000',
                      textShadow: '0 0 1px #fff',
                    }}
                  >
                    {stat.percent}%
                  </div>

                  {/* Coarse Thermometer Base: nsTop 35 ($23), nsLeft 21 ($15) */}
                  <img
                    data-testid={`goals-therm-${idx}`}
                    src={`${basePath}/thermometers/therm_${stat.thermCel}.png`}
                    alt={`Thermometer Level ${stat.thermCel}`}
                    style={{
                      position: 'absolute',
                      left: `${thermLeft}px`,
                      top: '35px',
                      width: '9px',
                      height: '52px',
                      imageRendering: 'pixelated',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Fine Meniscus Fill: nsTop 83 - (cel*5) ($53 - cel*5), nsLeft thermLeft + 1 */}
                  {stat.thermCel < 10 && stat.fineCel > 0 && (
                    <img
                      data-testid={`goals-fine-therm-${idx}`}
                      src={`${basePath}/thermometers/fine_therm_${stat.fineCel}.png`}
                      alt={`Fine Level ${stat.fineCel}`}
                      style={{
                        position: 'absolute',
                        left: `${fineLeft}px`,
                        top: `${fineTop}px`,
                        width: '7px',
                        height: '4px',
                        imageRendering: 'pixelated',
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  {/* Player Badge: nsTop 90 ($5a), nsLeft 18 ($12) */}
                  <button
                    data-testid={`goals-player-badge-${idx}`}
                    onClick={() => setDetailedPlayerIdx(idx)}
                    title={`Click to view detailed goals for ${stat.player.name}`}
                    style={{
                      position: 'absolute',
                      left: `${badgeLeft}px`,
                      top: '90px',
                      width: '15px',
                      height: '14px',
                      padding: 0,
                      border: stat.playerIndex === activePlayerIndex ? '1px solid #ffff00' : 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      imageRendering: 'pixelated',
                    }}
                  >
                    <img
                      src={`${basePath}/players/player_${idx + 1}.png`}
                      alt={stat.player.name}
                      style={{
                        width: '15px',
                        height: '14px',
                        imageRendering: 'pixelated',
                        display: 'block',
                      }}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* VIEW 2: Detailed Player Goal Breakdown Card (view.501) */
          selectedPlayerStats && (
            <div
              data-testid="goals-detailed-view"
              style={{
                position: 'absolute',
                left: '16px',
                top: '18px',
                width: '151px',
                height: '82px',
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '7px',
                lineHeight: '10px',
                color: '#000000',
              }}
            >
              {/* Player Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <img
                  src={`${basePath}/players/player_${selectedPlayerStats.playerIndex + 1}.png`}
                  alt="Badge"
                  style={{ width: '15px', height: '14px', imageRendering: 'pixelated' }}
                />
                <div style={{ fontWeight: 'bold', fontSize: '8px' }}>
                  {selectedPlayerStats.player.name} ({selectedPlayerStats.percent}%)
                </div>
              </div>

              {/* 4 Goal Categories */}
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', rowGap: '2px' }}>
                <div>Wealth:</div>
                <div style={{ fontWeight: 'bold' }}>
                  ${selectedPlayerStats.monStat} / ${selectedPlayerStats.monGoal}
                </div>

                <div>Happiness:</div>
                <div style={{ fontWeight: 'bold' }}>
                  {selectedPlayerStats.hapStat} / {selectedPlayerStats.hapGoal}
                </div>

                <div>Education:</div>
                <div style={{ fontWeight: 'bold' }}>
                  {selectedPlayerStats.eduStat} / {selectedPlayerStats.eduGoal}
                </div>

                <div>Career:</div>
                <div style={{ fontWeight: 'bold' }}>
                  {selectedPlayerStats.carStat} / {selectedPlayerStats.carGoal}
                </div>
              </div>

              {/* Total Goal Points */}
              <div style={{ marginTop: '4px', borderTop: '1px dashed #888', paddingTop: '2px', fontWeight: 'bold' }}>
                Goal Points: {selectedPlayerStats.sumAchieved} / {selectedPlayerStats.sumTarget}
              </div>
            </div>
          )
        )}

        {/* Done Button: view.250 Loop 2 Cel 0 at nsTop: 108 (0x6c), nsLeft: 143 (0x8f) */}
        <button
          onClick={onClose}
          data-testid="btn-goals-done"
          aria-label="Done"
          style={{
            position: 'absolute',
            left: '143px',
            top: '101px',
            width: '30px',
            height: '7px',
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            imageRendering: 'pixelated',
          }}
        >
          <img
            src={`${basePath}/buttons/done.png`}
            alt="Done"
            style={{
              width: '30px',
              height: '7px',
              imageRendering: 'pixelated',
              display: 'block',
            }}
          />
        </button>
      </div>
    </div>
  );
};
