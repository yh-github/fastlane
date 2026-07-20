import React, { useEffect, useRef, useState } from 'react';
import { initMapRenderer, updatePlayers } from '../graphics/mapRenderer';
import type { CampaignBundle } from '../engine/dataLoader';
import type { PlayerState } from '../engine/gameState';
import { useTranslation } from 'react-i18next';

interface GameMapProps {
  campaign: CampaignBundle | null;
  players: PlayerState[];
  activePlayerIndex: number;
  onNodeClick: (nodeId: string) => void;
}

export const GameMap: React.FC<GameMapProps> = ({ campaign, players, activePlayerIndex, onNodeClick }) => {
  const { t, i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const onNodeClickRef = useRef(onNodeClick);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);

  useEffect(() => {
    if (!containerRef.current || !campaign) return;

    let isMounted = true;

    const translatedBuildings = campaign.buildings.map(b => ({
      ...b,
      name: t(`building.${b.id}`, { defaultValue: b.name })
    }));

    initMapRenderer({
      container: containerRef.current,
      mapData: campaign.map,
      buildings: translatedBuildings,
      assetBasePath: `/campaigns/${campaign.config.name}`,
      onNodeClick: (nodeId) => {
        onNodeClickRef.current(nodeId);
      }
    }).then((cleanup) => {
      if (!isMounted) {
        cleanup();
      } else {
        cleanupRef.current = cleanup;
        setIsMapReady(true);
      }
    });

    return () => {
      isMounted = false;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [campaign, i18n.language]);

  useEffect(() => {
    if (isMapReady && players.length > 0 && campaign) {
      const renderPlayers = players.map((p, index) => {
        const node = campaign.map.nodes.find(n => n.id === p.position);
        return {
          position: { nodeId: node?.id || '', x: node?.x || 0, y: node?.y || 0 },
          index,
          isActive: index === activePlayerIndex
        };
      });
      updatePlayers(renderPlayers);
    }
  }, [players, activePlayerIndex, campaign, isMapReady]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative'
      }}
    />
  );
};
