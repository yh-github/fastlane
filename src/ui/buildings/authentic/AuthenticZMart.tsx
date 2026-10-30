import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { PlayerState, GameRules } from '../../../engine/gameState';
import type { CampaignBundle } from '../../../engine/dataLoader';
import { calcItemPrice } from '../../../engine/economyEngine';
import { getAvailableItemsForBuilding } from '../../buildingModal/clerkDialogue';
import { Z_MART_DIALOGUE } from './zMartData';

interface AuthenticZMartProps {
  player: PlayerState;
  onAction: (action: any) => void;
  onClose: () => void;
  campaign: CampaignBundle;
  economicIndex: number;
  rules?: GameRules;
  turn?: number;
  gameSeed?: number;
}

export const AuthenticZMart: React.FC<AuthenticZMartProps> = ({
  player,
  onAction,
  onClose,
  campaign,
  economicIndex,
  rules: _rules,
  turn = 1,
  gameSeed,
}) => {
  const isCdrom = campaign.config.name === '1990_classic_cdrom';
  const talkerFolder = isCdrom ? 'talker_cdrom' : 'talker_floppy';
  const talkerCelCount = isCdrom ? 11 : 6;
  const basePath = '/assets/authentic/buildings/z_mart';

  const [activeSpeech, setActiveSpeech] = useState<string>('');
  const [talkerCel, setTalkerCel] = useState<number>(0);
  const [isPunchingCard, setIsPunchingCard] = useState<boolean>(false);
  const [punchCel, setPunchCel] = useState<number>(0);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const speechTimerRef = useRef<NodeJS.Timeout | null>(null);
  const talkerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animTimersRef = useRef<NodeJS.Timeout[]>([]);

  const addAnimTimer = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    animTimersRef.current.push(t);
    return t;
  };

  const triggerSpeech = (text: string, durationMs: number = 3200) => {
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    if (talkerIntervalRef.current) clearInterval(talkerIntervalRef.current);

    setActiveSpeech(text);

    talkerIntervalRef.current = setInterval(() => {
      const nextCel = Math.floor(Math.random() * (talkerCelCount - 1)) + 1;
      setTalkerCel(nextCel);
    }, 100);

    speechTimerRef.current = setTimeout(() => {
      setTalkerCel(0);
      setActiveSpeech('');
      if (talkerIntervalRef.current) clearInterval(talkerIntervalRef.current);
    }, durationMs);
  };

  useEffect(() => {
    const greetings = Z_MART_DIALOGUE.welcomeGreetings;
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    triggerSpeech(greeting, 3500);

    return () => {
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      if (talkerIntervalRef.current) clearInterval(talkerIntervalRef.current);
      animTimersRef.current.forEach(clearTimeout);
      animTimersRef.current = [];
    };
  }, []);

  // Retrieve canonical weekly stock (6 items) from campaign building inventory
  const currentItems = useMemo(() => {
    const bld = campaign.buildings.find(b => b.id === 'z_mart');
    if (!bld) return [];
    const items = getAvailableItemsForBuilding(bld, campaign, turn, player.id, gameSeed);
    return items.slice(0, 6).map((it, idx) => ({
      id: it.id,
      name: it.name,
      price: calcItemPrice(it, economicIndex),
      hotkey: String(idx + 1),
    }));
  }, [campaign, turn, player.id, gameSeed, economicIndex]);

  const handleBuyItem = (item: { id: string; name: string; price: number }) => {
    if (player.money < item.price) {
      triggerSpeech(Z_MART_DIALOGUE.notEnoughCash, 2800);
      return;
    }

    onAction({ type: 'buy', itemId: item.id });
    const banter = Z_MART_DIALOGUE.clerkBanter[
      Math.floor(Math.random() * Z_MART_DIALOGUE.clerkBanter.length)
    ];
    triggerSpeech(banter, 3200);
  };

  const playerJobHere = player.currentJobId
    ? campaign.jobs.find(j => j.id === player.currentJobId && j.locationId === 'z_mart')
    : null;

  const handleWorkShift = () => {
    if (!playerJobHere) return;

    if ((player.hoursRemaining ?? 0) <= 0) {
      triggerSpeech('You do not have enough time left to work today.', 2800);
      return;
    }

    setIsPunchingCard(true);
    setPunchCel(0);

    addAnimTimer(() => setPunchCel(1), 120);
    addAnimTimer(() => setPunchCel(2), 240);
    addAnimTimer(() => setPunchCel(3), 360);
    addAnimTimer(() => {
      // In authentic Sierra SCI, the punch card stays in the window
      setPunchCel(3);
      onAction({ type: 'work', jobId: playerJobHere.id });
      triggerSpeech('Good job on the register today!', 3000);
    }, 550);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (key === 'ESCAPE' || key === 'D') {
        e.preventDefault();
        onClose();
      } else if (key === 'W' && playerJobHere) {
        e.preventDefault();
        handleWorkShift();
      } else {
        const item = currentItems.find(it => it.hotkey === key);
        if (item) {
          e.preventDefault();
          handleBuyItem(item);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerJobHere, player.hoursRemaining, player.money, currentItems]);

  return (
    <div
      data-testid="authentic-z-mart"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        imageRendering: 'pixelated',
        userSelect: 'none',
        overflow: 'visible',
        backgroundColor: '#000000',
      }}
    >
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
        }}
      >
        {/* Background (view.811) */}
        <img
          src={`${basePath}/bg.png`}
          alt="Z-Mart Backdrop"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '183px',
            height: '112px',
            display: 'block',
            pointerEvents: 'none',
          }}
        />

        {/* Talker (view.361 at x=115, y=0) */}
        <img
          data-testid="z-mart-talker"
          src={`${basePath}/${talkerFolder}/talker_${talkerCel}.png`}
          alt="Clerk"
          style={{
            position: 'absolute',
            left: '115px',
            top: '0px',
            width: '68px',
            height: '55px',
            display: 'block',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        />

        {/* Speech Bubble on left with pointer tail pointing to clerk's face */}
        {activeSpeech && (
          <div
            data-testid="z-mart-speech-bubble"
            style={{
              position: 'absolute',
              left: '6px',
              top: '4px',
              width: '102px',
              minHeight: '26px',
              backgroundColor: '#ffffea',
              border: '1px solid #000',
              borderRadius: '2px',
              padding: '2px 4px',
              boxSizing: 'border-box',
              fontFamily: 'monospace, "Courier New"',
              fontSize: '5.5px',
              lineHeight: '6.5px',
              color: '#000',
              zIndex: 10,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            <div
              data-testid="speech-tail-right"
              style={{
                position: 'absolute',
                right: '-7px',
                top: '12px',
                width: 0,
                height: 0,
                borderTop: '3.5px solid transparent',
                borderBottom: '3.5px solid transparent',
                borderLeft: '7px solid #000',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '-7px',
                  top: '-2.5px',
                  width: 0,
                  height: 0,
                  borderTop: '2.5px solid transparent',
                  borderBottom: '2.5px solid transparent',
                  borderLeft: '5.5px solid #ffffea',
                }}
              />
            </div>
            {activeSpeech}
          </div>
        )}

        {/* Available Weekly Items List (6 items) */}
        {currentItems.map((item, idx) => {
          const isHovered = hoveredItemId === item.id;
          const canAfford = player.money >= item.price;
          const topY = 40 + idx * 10;

          return (
            <div
              key={item.id}
              data-testid={`z-mart-item-${item.id}`}
              onClick={() => handleBuyItem(item)}
              onMouseEnter={() => setHoveredItemId(item.id)}
              onMouseLeave={() => setHoveredItemId(null)}
              style={{
                position: 'absolute',
                left: '11px',
                top: `${topY}px`,
                width: '100px',
                cursor: canAfford ? 'pointer' : 'default',
                fontFamily: 'monospace, "Courier New"',
                fontSize: '6px',
                fontWeight: 'bold',
                lineHeight: '7px',
                color: isHovered ? '#ffffff' : canAfford ? '#000000' : '#888888',
                backgroundColor: isHovered ? '#1e3a8a' : 'transparent',
                padding: '1px 2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                zIndex: 4,
              }}
              title={`${item.name} ($${item.price}) - Press ${item.hotkey}`}
            >
              {item.hotkey}. {item.name.padEnd(16, '.')}${item.price}
            </div>
          );
        })}

        {/* Work & Done Action Buttons (view.250 at nsTop: 108 sticking 3px out of 112px window) */}
        {playerJobHere && (
          <img
            data-testid="btn-z-mart-work"
            src={`${basePath}/buttons/work.png`}
            alt="Work"
            onClick={handleWorkShift}
            style={{
              position: 'absolute',
              left: '75px',
              top: '108px',
              width: '30px',
              height: '7px',
              cursor: 'pointer',
              zIndex: 10,
            }}
            title="Work shift (W)"
          />
        )}

        <img
          data-testid="btn-z-mart-done"
          src={`${basePath}/buttons/done.png`}
          alt="Done"
          onClick={onClose}
          style={{
            position: 'absolute',
            left: '143px',
            top: '108px',
            width: '30px',
            height: '7px',
            cursor: 'pointer',
            zIndex: 10,
          }}
          title="Done / Exit (Esc / D)"
        />

        {/* Time Clock Punch Card Animation */}
        {isPunchingCard && (
          <img
            data-testid="punch-card-anim"
            src={`/assets/authentic/punch_card/punch_${punchCel}.png`}
            alt="Punching Card"
            style={{
              position: 'absolute',
              left: '0px',
              top: '38px',
              width: '68px',
              height: '55px',
              zIndex: 20,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
    </div>
  );
};
