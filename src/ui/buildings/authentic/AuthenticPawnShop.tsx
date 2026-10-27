import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { PlayerState, GameRules } from '../../../engine/gameState';
import type { CampaignBundle } from '../../../engine/dataLoader';
import { calcItemPrice } from '../../../engine/economyEngine';
import { PAWN_SHOP_DIALOGUE } from './pawnShopData';

interface AuthenticPawnShopProps {
  player: PlayerState;
  onAction: (action: any) => void;
  onClose: () => void;
  campaign: CampaignBundle;
  economicIndex: number;
  rules?: GameRules;
}

type PawnShopMode = 'menu' | 'pawn' | 'redeem' | 'buy';

export const AuthenticPawnShop: React.FC<AuthenticPawnShopProps> = ({
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
  const basePath = '/assets/authentic/buildings/pawn_shop';

  const [mode, setMode] = useState<PawnShopMode>('menu');
  const [activeSpeech, setActiveSpeech] = useState<string>('');
  const [talkerCel, setTalkerCel] = useState<number>(0);
  const [isPunchingCard, setIsPunchingCard] = useState<boolean>(false);
  const [punchCel, setPunchCel] = useState<number>(0);

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
    const greetings = PAWN_SHOP_DIALOGUE.welcomeGreetings;
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    triggerSpeech(greeting, 3500);

    return () => {
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      if (talkerIntervalRef.current) clearInterval(talkerIntervalRef.current);
      animTimersRef.current.forEach(clearTimeout);
      animTimersRef.current = [];
    };
  }, []);

  const pawnableItems = useMemo(() => {
    const ownedApplianceIds = (player.inventory?.appliances ?? []).map(a => a.id);
    return campaign.items.filter(i => ownedApplianceIds.includes(i.id));
  }, [player.inventory?.appliances, campaign.items]);

  const pawnedItems = useMemo(() => {
    const pIds = (player.inventory?.pawnedItems ?? []).map(p => p.itemId);
    return campaign.items.filter(i => pIds.includes(i.id));
  }, [player.inventory?.pawnedItems, campaign.items]);

  // Items in pawn shop for sale
  const buyableItems = useMemo(() => {
    const bld = campaign.buildings.find(b => b.id === 'pawn_shop');
    return (bld?.inventory ?? []).map(inv => {
      const def = campaign.items.find(i => i.id === inv.itemId);
      const basePrice = inv.priceOverride ?? def?.basePrice ?? 50;
      const price = calcItemPrice({ ...(def ?? {}), basePrice }, economicIndex);
      return { def, price, itemId: inv.itemId };
    }).filter(e => !!e.def);
  }, [campaign.buildings, campaign.items, economicIndex]);

  const handlePawnItem = (itemId: string) => {
    onAction({ type: 'pawn', itemId });
    const banter = PAWN_SHOP_DIALOGUE.clerkBanter[
      Math.floor(Math.random() * PAWN_SHOP_DIALOGUE.clerkBanter.length)
    ];
    triggerSpeech(banter, 3000);
  };

  const handleRedeemItem = (itemId: string) => {
    onAction({ type: 'redeem', itemId });
    const banter = PAWN_SHOP_DIALOGUE.clerkBanter[
      Math.floor(Math.random() * PAWN_SHOP_DIALOGUE.clerkBanter.length)
    ];
    triggerSpeech(banter, 3000);
  };

  const handleBuyItem = (itemId: string, price: number) => {
    if (player.money < price) {
      triggerSpeech(PAWN_SHOP_DIALOGUE.notEnoughCash, 2800);
      return;
    }
    onAction({ type: 'buy', itemId });
    const banter = PAWN_SHOP_DIALOGUE.clerkBanter[
      Math.floor(Math.random() * PAWN_SHOP_DIALOGUE.clerkBanter.length)
    ];
    triggerSpeech(banter, 3000);
  };

  const playerJobHere = player.currentJobId
    ? campaign.jobs.find(j => j.id === player.currentJobId && j.locationId === 'pawn_shop')
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
      triggerSpeech('Another shift dealing with pawns complete!', 3000);
    }, 550);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (key === 'ESCAPE') {
        e.preventDefault();
        if (mode !== 'menu') {
          setMode('menu');
        } else {
          onClose();
        }
      } else if (key === 'D') {
        e.preventDefault();
        onClose();
      } else if (key === 'W' && playerJobHere) {
        e.preventDefault();
        handleWorkShift();
      } else if (mode === 'menu') {
        if (key === 'P' || key === '1') {
          e.preventDefault();
          if (pawnableItems.length === 0) triggerSpeech(PAWN_SHOP_DIALOGUE.noItemsToSell, 2500);
          else setMode('pawn');
        } else if (key === 'R' || key === '2') {
          e.preventDefault();
          if (pawnedItems.length === 0) triggerSpeech(PAWN_SHOP_DIALOGUE.noRedeemable, 2500);
          else setMode('redeem');
        } else if (key === 'B' || key === '3') {
          e.preventDefault();
          if (buyableItems.length === 0) triggerSpeech(PAWN_SHOP_DIALOGUE.noPawned, 2500);
          else setMode('buy');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, playerJobHere, pawnableItems, pawnedItems, buyableItems]);

  return (
    <div
      data-testid="authentic-pawn-shop"
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
        {/* Background (view.712) */}
      <img
        src={`${basePath}/bg.png`}
        alt="Pawn Shop Backdrop"
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

      {/* Talker (view.362 at x=0, y=1) */}
      <img
        data-testid="pawn-shop-talker"
        src={`${basePath}/${talkerFolder}/talker_${talkerCel}.png`}
        alt="Pawnbroker"
        style={{
          position: 'absolute',
          left: '0px',
          top: '1px',
          width: '68px',
          height: '55px',
          display: 'block',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      {/* Speech Bubble on right with pointer tail pointing to clerk's face */}
      {activeSpeech && (
        <div
          data-testid="pawn-shop-speech-bubble"
          style={{
            position: 'absolute',
            left: '71px',
            top: '6px',
            width: '106px',
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
            data-testid="speech-tail-left"
            style={{
              position: 'absolute',
              left: '-7px',
              top: '12px',
              width: 0,
              height: 0,
              borderTop: '3.5px solid transparent',
              borderBottom: '3.5px solid transparent',
              borderRight: '7px solid #000',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '1.5px',
                top: '-2.5px',
                width: 0,
                height: 0,
                borderTop: '2.5px solid transparent',
                borderBottom: '2.5px solid transparent',
                borderRight: '5.5px solid #ffffea',
              }}
            />
          </div>
          {activeSpeech}
        </div>
      )}

      {/* Main Mode Menu (PAWN / REDEEM / BUY) */}
      {mode === 'menu' && (
        <div style={{ position: 'absolute', left: '76px', top: '40px', zIndex: 5 }}>
          <div
            data-testid="btn-pawn-mode"
            onClick={() => {
              if (pawnableItems.length === 0) triggerSpeech(PAWN_SHOP_DIALOGUE.noItemsToSell, 2500);
              else setMode('pawn');
            }}
            style={{
              cursor: 'pointer',
              fontFamily: 'monospace, "Courier New"',
              fontSize: '7.5px',
              fontWeight: 'bold',
              color: '#000',
              padding: '2px 4px',
              marginBottom: '6px',
              border: '1px solid #000',
              backgroundColor: '#ffffea',
              textAlign: 'center',
              width: '80px',
            }}
          >
            1. PAWN ITEMS
          </div>

          <div
            data-testid="btn-redeem-mode"
            onClick={() => {
              if (pawnedItems.length === 0) triggerSpeech(PAWN_SHOP_DIALOGUE.noRedeemable, 2500);
              else setMode('redeem');
            }}
            style={{
              cursor: 'pointer',
              fontFamily: 'monospace, "Courier New"',
              fontSize: '7.5px',
              fontWeight: 'bold',
              color: '#000',
              padding: '2px 4px',
              marginBottom: '6px',
              border: '1px solid #000',
              backgroundColor: '#ffffea',
              textAlign: 'center',
              width: '80px',
            }}
          >
            2. REDEEM ITEMS
          </div>

          <div
            data-testid="btn-buy-mode"
            onClick={() => {
              if (buyableItems.length === 0) triggerSpeech(PAWN_SHOP_DIALOGUE.noPawned, 2500);
              else setMode('buy');
            }}
            style={{
              cursor: 'pointer',
              fontFamily: 'monospace, "Courier New"',
              fontSize: '7.5px',
              fontWeight: 'bold',
              color: '#000',
              padding: '2px 4px',
              border: '1px solid #000',
              backgroundColor: '#ffffea',
              textAlign: 'center',
              width: '80px',
            }}
          >
            3. BUY ITEMS
          </div>
        </div>
      )}

      {/* Sub-modes: PAWN / REDEEM / BUY */}
      {mode !== 'menu' && (
        <div style={{ position: 'absolute', left: '72px', top: '36px', width: '106px', zIndex: 5 }}>
          <div style={{ fontFamily: 'monospace', fontSize: '6px', fontWeight: 'bold', marginBottom: '2px', color: '#1e3a8a' }}>
            {mode === 'pawn' && 'YOUR ITEMS TO PAWN:'}
            {mode === 'redeem' && 'REDEEM YOUR PAWNED ITEMS:'}
            {mode === 'buy' && 'PAWNED ITEMS FOR SALE:'}
          </div>

          <div style={{ maxHeight: '55px', overflowY: 'auto' }}>
            {mode === 'pawn' && pawnableItems.map(item => (
              <div
                key={item.id}
                data-testid={`pawn-item-${item.id}`}
                onClick={() => handlePawnItem(item.id)}
                style={{
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: '6px',
                  padding: '1px 2px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #888',
                  marginBottom: '2px',
                }}
              >
                Pawn {item.name} (+${Math.round((item.basePrice ?? 50) * 0.5)})
              </div>
            ))}

            {mode === 'redeem' && pawnedItems.map(item => (
              <div
                key={item.id}
                data-testid={`redeem-item-${item.id}`}
                onClick={() => handleRedeemItem(item.id)}
                style={{
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: '6px',
                  padding: '1px 2px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #888',
                  marginBottom: '2px',
                }}
              >
                Redeem {item.name} (-${Math.round((item.basePrice ?? 50) * 0.6)})
              </div>
            ))}

            {mode === 'buy' && buyableItems.map(entry => (
              <div
                key={entry.itemId}
                data-testid={`buy-pawn-item-${entry.itemId}`}
                onClick={() => handleBuyItem(entry.itemId, entry.price)}
                style={{
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: '6px',
                  padding: '1px 2px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #888',
                  marginBottom: '2px',
                }}
              >
                {entry.def?.name ?? "Item"} (${entry.price})
              </div>
            ))}
          </div>

          <button
            type="button"
            data-testid="btn-pawn-back"
            onClick={() => setMode('menu')}
            style={{
              marginTop: '2px',
              fontFamily: 'monospace',
              fontSize: '6px',
              padding: '1px 6px',
              cursor: 'pointer',
            }}
          >
            « Back
          </button>
        </div>
      )}

      {/* Work & Done Action Buttons (view.250) */}
      {playerJobHere && (
        <img
          data-testid="btn-pawn-work"
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
        data-testid="btn-pawn-done"
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
            top: '56px',
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
