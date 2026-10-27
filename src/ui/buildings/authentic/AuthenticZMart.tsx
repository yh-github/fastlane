import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { PlayerState, GameRules } from '../../../engine/gameState';
import type { CampaignBundle } from '../../../engine/dataLoader';
import { calcItemPrice } from '../../../engine/economyEngine';
import { Z_MART_ITEMS, Z_MART_DIALOGUE, type ZMartItemEntry } from './zMartData';

interface AuthenticZMartProps {
  player: PlayerState;
  onAction: (action: any) => void;
  onClose: () => void;
  campaign: CampaignBundle;
  economicIndex: number;
  rules?: GameRules;
}

export const AuthenticZMart: React.FC<AuthenticZMartProps> = ({
  player,
  onAction,
  onClose,
  campaign,
  economicIndex,
  rules: _rules,
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
  const [page, setPage] = useState<number>(0);

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

  const itemsMap = useMemo(() => {
    const map = new Map<string, { itemDef: any; price: number }>();
    const bld = campaign.buildings.find(b => b.id === 'z_mart');
    for (const mItem of Z_MART_ITEMS) {
      const def = campaign.items.find(i => i.id === mItem.id);
      if (def) {
        const invEntry = bld?.inventory?.find(inv => inv.itemId === mItem.id);
        const basePrice = invEntry?.priceOverride ?? def.basePrice ?? 0;
        const price = calcItemPrice({ ...def, basePrice }, economicIndex);
        map.set(mItem.id, { itemDef: def, price });
      }
    }
    return map;
  }, [campaign.items, campaign.buildings, economicIndex]);

  const pageSize = 6;
  const totalPages = Math.ceil(Z_MART_ITEMS.length / pageSize);
  const currentItems = Z_MART_ITEMS.slice(page * pageSize, (page + 1) * pageSize);

  const handleBuyItem = (mItem: ZMartItemEntry) => {
    const itemData = itemsMap.get(mItem.id);
    if (!itemData) return;

    if (player.money < itemData.price) {
      triggerSpeech(Z_MART_DIALOGUE.notEnoughCash, 2800);
      return;
    }

    onAction({ type: 'buy', itemId: mItem.id });
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

    const shiftCost = campaign.config.timeRules.workSessionCost ?? 6;
    const hasEnoughHours = (player.hoursRemaining ?? 0) >= shiftCost;

    if (!hasEnoughHours) {
      triggerSpeech('You do not have enough time left to work a full shift today.', 2800);
      return;
    }

    setIsPunchingCard(true);
    setPunchCel(0);

    addAnimTimer(() => setPunchCel(1), 120);
    addAnimTimer(() => setPunchCel(2), 240);
    addAnimTimer(() => setPunchCel(3), 360);
    addAnimTimer(() => {
      setIsPunchingCard(false);
      onAction({ type: 'work' });
      triggerSpeech('Another thrifty day at Z-Mart in the books!', 3000);
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
      } else if (key === 'N' || key === 'TAB') {
        e.preventDefault();
        setPage(prev => (prev + 1) % totalPages);
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
  }, [playerJobHere, player.hoursRemaining, player.money, itemsMap, currentItems, totalPages]);

  return (
    <div
      data-testid="authentic-z-mart"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        imageRendering: 'pixelated',
        userSelect: 'none',
        overflow: 'hidden',
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
        alt="Z-Mart Clerk"
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
            fontSize: '6.5px',
            lineHeight: '7.5px',
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

      {/* Items List (Paginated) */}
      {currentItems.map((item, idx) => {
        const data = itemsMap.get(item.id);
        if (!data) return null;
        const isHovered = hoveredItemId === item.id;
        const canAfford = player.money >= data.price;
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
              cursor: canAfford ? 'pointer' : 'default',
              fontFamily: 'monospace, "Courier New"',
              fontSize: '6.5px',
              fontWeight: 'bold',
              lineHeight: '7px',
              color: isHovered ? '#ffffff' : canAfford ? '#000000' : '#888888',
              backgroundColor: isHovered ? '#1e3a8a' : 'transparent',
              padding: '0 2px',
              whiteSpace: 'pre',
              zIndex: 4,
            }}
            title={`${item.name} ($${data.price})`}
          >
            {item.name.padEnd(14, ' ')} ${data.price}
          </div>
        );
      })}

      {/* Paging link if > 1 page */}
      {totalPages > 1 && (
        <div
          data-testid="btn-z-mart-page"
          onClick={() => setPage((page + 1) % totalPages)}
          style={{
            position: 'absolute',
            left: '11px',
            top: '100px',
            cursor: 'pointer',
            fontFamily: 'monospace, "Courier New"',
            fontSize: '6px',
            color: '#1e3a8a',
            fontWeight: 'bold',
            textDecoration: 'underline',
            zIndex: 5,
          }}
          title="Next page (N)"
        >
          [Page {page + 1}/{totalPages} - More]
        </div>
      )}

      {/* Work & Done Action Buttons (view.250) */}
      {playerJobHere && (
        <img
          data-testid="btn-z-mart-work"
          src={`${basePath}/buttons/work.png`}
          alt="Work"
          onClick={handleWorkShift}
          style={{
            position: 'absolute',
            left: '75px',
            top: '104px',
            width: '30px',
            height: '7px',
            cursor: 'pointer',
            zIndex: 5,
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
          top: '104px',
          width: '30px',
          height: '7px',
          cursor: 'pointer',
          zIndex: 5,
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
            top: '39px',
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
