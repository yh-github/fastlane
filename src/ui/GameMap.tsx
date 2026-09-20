import React, { useEffect, useRef, useState } from 'react';
import { initMapRenderer, updatePlayers, updateBuildingLabels } from '../graphics/mapRenderer';
import type { CampaignBundle } from '../engine/dataLoader';
import type { PlayerState } from '../engine/gameState';
import { useTranslation } from 'react-i18next';

interface GameMapProps {
  campaign: CampaignBundle | null;
  players: PlayerState[];
  activePlayerIndex: number;
  onNodeClick: (nodeId: string) => void;
  authenticCurvedPaths?: boolean;
}

export const GameMap: React.FC<GameMapProps> = ({ campaign, players, activePlayerIndex, onNodeClick, authenticCurvedPaths }) => {
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
    setIsMapReady(false);

    const translatedBuildings = campaign.buildings.map(b => ({
      ...b,
      name: t(`building.${b.id}`, { defaultValue: b.name })
    }));

    initMapRenderer({
      container: containerRef.current,
      mapData: campaign.map,
      buildings: translatedBuildings,
      assetBasePath: `/campaigns/${campaign.config.name}`,
      authenticCurvedPaths,
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
      setIsMapReady(false);
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [campaign, authenticCurvedPaths]);

  // Dynamically update building text labels when language changes without recreating WebGL canvas
  useEffect(() => {
    if (isMapReady && campaign) {
      const translatedBuildings = campaign.buildings.map(b => ({
        id: b.id,
        name: t(`building.${b.id}`, { defaultValue: b.name })
      }));
      updateBuildingLabels(translatedBuildings);
    }
  }, [campaign, isMapReady, i18n.language, t]);

  useEffect(() => {
    if (isMapReady && players.length > 0 && campaign) {
      const useAuthentic = authenticCurvedPaths !== false && !!campaign.map.authenticNodes;
      const renderPlayers = players.map((p, index) => {
        const authPos = useAuthentic ? campaign.map.authenticNodes?.[p.position] : undefined;
        const node = campaign.map.nodes.find(n => n.id === p.position);
        return {
          position: {
            nodeId: p.position,
            x: authPos ? authPos.x : (node?.x || 0),
            y: authPos ? authPos.y : (node?.y || 0)
          },
          index,
          isActive: index === activePlayerIndex
        };
      });
      updatePlayers(renderPlayers);
    }
  }, [players, activePlayerIndex, campaign, isMapReady, authenticCurvedPaths]);

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
