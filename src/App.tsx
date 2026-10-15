import { useState } from 'react';
import { TitleScreen } from './ui/TitleScreen';
import { SetupScreen } from './ui/SetupScreen';
import { GameOverScreen } from './ui/GameOverScreen';
import { GameSession } from './ui/GameSession';
import { OrientationPrompt } from './ui/OrientationPrompt';
import { attemptLockLandscape } from './hooks/useScreenOrientation';
import { loadCampaign, type CampaignBundle } from './engine/dataLoader';
import { createInitialGameState, type GameState, type PlayerConfig } from './engine/gameState';
import { processTurnStart } from './engine/turnProcessor';
import { generateRandomSeed } from './utils/rng';
import type { ReplayData } from './engine/replayTypes';

export default function App() {
  const [screen, setScreen] = useState<'title' | 'setup' | 'playing' | 'game-over'>('title');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<CampaignBundle | null>(null);
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [initialGameState, setInitialGameState] = useState<GameState | null>(null);
  const [gameSessionKey, setGameSessionKey] = useState(0);
  const [gameOverInfo, setGameOverInfo] = useState<{
    playerName: string;
    turn: number;
    replayData: ReplayData | null;
  } | null>(null);

  const handleStartCampaign = async (campaignId: string) => {
    attemptLockLandscape();
    setSelectedCampaignId(campaignId);
    setIsLoadingCampaign(true);
    setLoadingError(null);
    try {
      const bundle = await loadCampaign(campaignId);
      setCampaign(bundle);
      setIsLoadingCampaign(false);
      setScreen('setup');
    } catch (err: any) {
      console.error('[App] Campaign load failed:', err);
      setLoadingError(err.message || 'Failed to load campaign');
      setIsLoadingCampaign(false);
    }
  };

  const handleSetupConfirm = (playersConfig: PlayerConfig[]) => {
    attemptLockLandscape();
    if (!campaign) return;
    const randomSeed = generateRandomSeed();
    let savedCurvedBoard: boolean | undefined = undefined;
    try {
      const stored = localStorage.getItem('fastlane_curved_board');
      if (stored !== null) {
        savedCurvedBoard = stored === 'true';
      }
    } catch {
      // ignore
    }
    let savedHudLayout: 'auto' | 'side' | 'top' | undefined = undefined;
    try {
      const stored = localStorage.getItem('fastlane_hud_layout');
      if (stored === 'auto' || stored === 'side' || stored === 'top') {
        savedHudLayout = stored;
      }
    } catch {
      // ignore
    }
    let savedWorkConsoleStyle: 'popup' | 'flanking' | undefined = undefined;
    try {
      const stored = localStorage.getItem('fastlane_work_console_style');
      if (stored === 'popup' || stored === 'flanking') {
        savedWorkConsoleStyle = stored;
      }
    } catch {
      // ignore
    }
    const initialRules = {
      ...(savedCurvedBoard !== undefined ? { authenticCurvedPaths: savedCurvedBoard } : {}),
      ...(savedHudLayout !== undefined ? { hudLayout: savedHudLayout } : {}),
      ...(savedWorkConsoleStyle !== undefined ? { workConsoleStyle: savedWorkConsoleStyle } : {})
    };
    const baseInitialState = createInitialGameState(
      campaign,
      playersConfig,
      'node_low_cost',
      Object.keys(initialRules).length > 0 ? initialRules : undefined,
      randomSeed
    );
    const firstTurnState = processTurnStart({ ...baseInitialState, phase: 'playing' }, campaign);
    setInitialGameState(firstTurnState);
    setGameSessionKey(prev => prev + 1);
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
    setScreen('playing');
  };

  let screenContent = null;

  if (isLoadingCampaign) {
    screenContent = <div className="loading-screen">Loading campaign data…</div>;
  } else if (loadingError) {
    screenContent = <div className="error-screen">Error: {loadingError}</div>;
  } else if (screen === 'title') {
    screenContent = <TitleScreen onStartGame={handleStartCampaign} />;
  } else if (screen === 'setup') {
    if (campaign) {
      screenContent = (
        <SetupScreen
          key={campaign.config.name || selectedCampaignId || 'setup'}
          winConditions={campaign.config.winConditions}
          onConfirm={handleSetupConfirm}
        />
      );
    }
  } else if (screen === 'game-over') {
    screenContent = (
      <GameOverScreen
        playerName={gameOverInfo?.playerName || 'Player 1'}
        turn={gameOverInfo?.turn || 1}
        replayData={gameOverInfo?.replayData || null}
        onPlayAgain={() => {
          setScreen('title');
          setInitialGameState(null);
        }}
      />
    );
  } else if (screen === 'playing' && campaign && initialGameState) {
    screenContent = (
      <GameSession
        key={gameSessionKey}
        campaign={campaign}
        initialGameState={initialGameState}
        onGameOver={(info) => {
          setGameOverInfo(info);
          setScreen('game-over');
        }}
        onQuitToTitle={() => {
          setScreen('title');
          setInitialGameState(null);
        }}
      />
    );
  }

  return (
    <>
      <OrientationPrompt />
      {screenContent}
    </>
  );
}
