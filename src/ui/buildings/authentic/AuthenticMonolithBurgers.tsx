import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { PlayerState, GameRules } from '../../../engine/gameState';
import type { CampaignBundle } from '../../../engine/dataLoader';
import { calcItemPrice } from '../../../engine/economyEngine';
import {
  MONOLITH_MENU_ITEMS,
  MONOLITH_GREETINGS,
  MONOLITH_BANTER,
  MONOLITH_NOT_ENOUGH_CASH,
  type MonolithMenuItem
} from './monolithBurgersData';

interface AuthenticMonolithBurgersProps {
  player: PlayerState;
  onAction: (action: any) => void;
  onClose: () => void;
  campaign: CampaignBundle;
  economicIndex?: number;
  rules?: GameRules;
}

export const AuthenticMonolithBurgers: React.FC<AuthenticMonolithBurgersProps> = ({
  player,
  onAction,
  onClose,
  campaign,
  economicIndex = 0,
  rules: _rules
}) => {
  const isCdrom = campaign.config.name === '1990_classic_cdrom';
  const talkerCelCount = isCdrom ? 11 : 6;
  const talkerFolder = isCdrom ? 'talker_cdrom' : 'talker_floppy';
  const basePath = '/assets/authentic/buildings/monolith_burgers';

  // Check if player works here
  const playerJobHere = player.currentJobId 
    ? campaign.jobs.find(j => j.id === player.currentJobId && j.locationId === 'burger_palace')
    : null;

  const [activeSpeech, setActiveSpeech] = useState<string>('');
  const [talkerCel, setTalkerCel] = useState<number>(0);
  const [cyclingCel, setCyclingCel] = useState<number>(0);
  const [lockedCel, setLockedCel] = useState<number | null>(null);
  const [isPunchingCard, setIsPunchingCard] = useState<boolean>(false);
  const [punchCel, setPunchCel] = useState<number>(0);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const speechTimerRef = useRef<NodeJS.Timeout | null>(null);
  const talkerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animTimersRef = useRef<NodeJS.Timeout[]>([]);

  const addAnimTimer = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    animTimersRef.current.push(t);
    return t;
  };

  // Food item display cycling (view.710 loop 1, cels 0..5): cycles authentic 60 cycles (~3.2s) when not locked
  useEffect(() => {
    if (lockedCel !== null || isPunchingCard) return;
    const interval = setInterval(() => {
      setCyclingCel(prev => (prev + 1) % MONOLITH_MENU_ITEMS.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [lockedCel, isPunchingCard]);

  const activeCel = lockedCel !== null ? lockedCel : cyclingCel;
  const activeFoodFile = MONOLITH_MENU_ITEMS[activeCel]?.foodFile ?? 'food_hamburger.png';

  // Speak dialogue and animate mouth
  const triggerSpeech = (text: string, durationMs: number = 3200) => {
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    if (talkerIntervalRef.current) clearInterval(talkerIntervalRef.current);

    setActiveSpeech(text);

    // Mouth animation cycling
    talkerIntervalRef.current = setInterval(() => {
      // Pick random speaking mouth cel (cels 1 to talkerCelCount-1)
      const nextCel = Math.floor(Math.random() * (talkerCelCount - 1)) + 1;
      setTalkerCel(nextCel);
    }, 100);

    speechTimerRef.current = setTimeout(() => {
      setTalkerCel(0); // Mouth closed
      setActiveSpeech('');
      if (talkerIntervalRef.current) clearInterval(talkerIntervalRef.current);
    }, durationMs);
  };

  // Initial random entrance greeting
  useEffect(() => {
    const greeting = MONOLITH_GREETINGS[Math.floor(Math.random() * MONOLITH_GREETINGS.length)];
    triggerSpeech(greeting, 3500);

    return () => {
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      if (talkerIntervalRef.current) clearInterval(talkerIntervalRef.current);
      animTimersRef.current.forEach(clearTimeout);
      animTimersRef.current = [];
    };
  }, []);

  // Compute item map and current prices (taking building.inventory overrides into account)
  const itemsMap = useMemo(() => {
    const map = new Map<string, { itemDef: any; price: number }>();
    const bld = campaign.buildings.find(b => b.id === 'burger_palace');
    for (const mItem of MONOLITH_MENU_ITEMS) {
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

  // Handle purchasing an item
  const handleBuyItem = (mItem: MonolithMenuItem) => {
    const itemData = itemsMap.get(mItem.id);
    if (!itemData) return;

    if (player.money < itemData.price) {
      triggerSpeech(MONOLITH_NOT_ENOUGH_CASH, 2800);
      return;
    }

    // Dispatch buy action
    onAction({ type: 'buy', itemId: mItem.id });

    // In authentic Sierra SCI (script.104), purchasing an item locks the item window to that item's cel
    // without returning to cycling. Also clears punch card display if it was showing.
    setIsPunchingCard(false);
    setLockedCel(mItem.celNum);
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }

    // Pick random banter
    const banter = MONOLITH_BANTER[Math.floor(Math.random() * MONOLITH_BANTER.length)];
    triggerSpeech(banter, 3200);
  };

  // Handle working a shift
  const handleWorkShift = () => {
    if (!playerJobHere) return;

    if ((player.hoursRemaining ?? 0) <= 0) {
      triggerSpeech('You do not have enough time left to work today.', 2800);
      return;
    }

    // Animate punch card
    setIsPunchingCard(true);
    setPunchCel(0);
    addAnimTimer(() => setPunchCel(1), 120);
    addAnimTimer(() => setPunchCel(2), 240);
    addAnimTimer(() => setPunchCel(3), 360);
    addAnimTimer(() => {
      // In authentic Sierra SCI, the punch clock stays in the item window after work
      setPunchCel(3);
      onAction({ type: 'work', jobId: playerJobHere.id });
      triggerSpeech('Have a nice day.', 2500);
    }, 480);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'x' || e.key === 'X') {
        onClose();
      } else if (e.key === 'w' || e.key === 'W') {
        if (playerJobHere) handleWorkShift();
      } else if (e.key >= '1' && e.key <= '6') {
        const idx = parseInt(e.key, 10) - 1;
        if (MONOLITH_MENU_ITEMS[idx]) {
          handleBuyItem(MONOLITH_MENU_ITEMS[idx]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerJobHere, itemsMap, player.money, player.hoursRemaining]);

  return (
    <div
      data-testid="authentic-monolith-burgers"
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
      {/* 183x112 Native Resolution Viewport Scaled to Container */}
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
        {/* Layer 1: Background (view.810) */}
        <img
          src={`${basePath}/bg.png`}
          alt="Monolith Burgers Counter"
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

        {/* Layer 2: The Talker / Cashier (view.360) */}
        <img
          data-testid="monolith-talker"
          src={`${basePath}/${talkerFolder}/talker_${talkerCel}.png`}
          alt="Cashier"
          style={{
            position: 'absolute',
            left: '115px',
            top: '0px',
            width: '68px',
            height: '55px',
            imageRendering: 'pixelated',
            pointerEvents: 'none',
          }}
        />

        {/* Layer 3: Item Window (view.710 cels are full 68x55 sprites at nsLeft 0, nsTop $39).
            The punch card (view.750) occupies this exact same slot. */}
        <div
          data-testid="monolith-counter"
          style={{
            position: 'absolute',
            left: '0px',
            top: '57px',
            width: '68px',
            height: '55px',
            pointerEvents: 'none',
            zIndex: 4,
          }}
        >
          <img
            data-testid="monolith-food-item"
            src={`${basePath}/counter/${activeFoodFile}`}
            alt="Food Window"
            style={{
              width: '68px',
              height: '55px',
              display: 'block',
              imageRendering: 'pixelated',
            }}
          />
        </div>

        {/* Layer 4: Interactive Menu Board Items */}
        {MONOLITH_MENU_ITEMS.map((item) => {
          const itemData = itemsMap.get(item.id);
          const price = itemData?.price ?? 0;
          const isHovered = hoveredItemId === item.id;
          const canAfford = player.money >= price;

          return (
            <div
              key={item.id}
              data-testid={`menu-item-${item.id}`}
              onClick={() => handleBuyItem(item)}
              onMouseEnter={() => setHoveredItemId(item.id)}
              onMouseLeave={() => setHoveredItemId(null)}
              style={{
                position: 'absolute',
                left: `${item.left}px`,
                top: `${item.top}px`,
                cursor: 'pointer',
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '6px',
                fontWeight: 'bold',
                lineHeight: '7.5px',
                color: isHovered ? '#ffffff' : canAfford ? '#6a2029' : '#9e8e80',
                backgroundColor: isHovered ? '#8b2020' : 'transparent',
                padding: '0 1px',
                whiteSpace: 'pre',
                letterSpacing: '0.1px',
                textShadow: isHovered ? '0.75px 0.75px 0px #300808' : '0.75px 0.75px 0px #e6ca9c',
                zIndex: 5,
              }}
              title={`Buy ${item.label} ($${price})`}
            >
              {item.dots} ${price.toString().padStart(3, ' ')}
            </div>
          );
        })}

        {/* Layer 5: Buttons (view.250 Loop 1 Cel 0 at nsLeft: 75, nsTop: 108 sticking 3px out of 112px window) */}
        {playerJobHere && (
          <img
            data-testid="btn-monolith-work"
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
              imageRendering: 'pixelated',
              zIndex: 10,
            }}
            title="Work Shift (W)"
          />
        )}

        <img
          data-testid="btn-monolith-done"
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
            imageRendering: 'pixelated',
            zIndex: 10,
          }}
          title="Done (Exit)"
        />

        {/* Layer 6: Punch Card Overlay during Work (view.750 on the counter at 0, 57) */}
        {isPunchingCard && (
          <div
            data-testid="monolith-punch-card"
            style={{
              position: 'absolute',
              left: '0px',
              top: '57px',
              width: '68px',
              height: '55px',
              zIndex: 20,
              pointerEvents: 'none',
            }}
          >
            <img
              src={`/assets/authentic/punch_card/punch_${punchCel}.png`}
              alt="Punch Card"
              style={{ width: '68px', height: '55px', imageRendering: 'pixelated' }}
            />
          </div>
        )}

        {/* Layer 7: Classic Sierra Speech Banner (PrintD) */}
        {activeSpeech && (
          <div
            data-testid="monolith-speech-bubble"
            onClick={() => setActiveSpeech('')}
            style={{
              position: 'absolute',
              left: '6px',
              top: '4px',
              width: '110px',
              backgroundColor: '#ffffea',
              border: '1.5px solid #000000',
              boxShadow: '1.5px 1.5px 0px rgba(0,0,0,0.6)',
              padding: '2px 4px',
              fontFamily: 'monospace, "Courier New"',
              fontSize: '5.5px',
              lineHeight: '6.5px',
              color: '#000000',
              zIndex: 15,
              cursor: 'pointer',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
            }}
          >
            {/* Speech bubble tail pointing towards cashier face on the right */}
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
                borderLeft: '7px solid #000000',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  right: '1.5px',
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
      </div>
    </div>
  );
};
