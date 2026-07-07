import React, { useEffect, useRef } from 'react';
import { initMapRenderer, movePlayerTo } from '../graphics/mapRenderer';
import type { CampaignBundle } from '../engine/dataLoader';
import type { PlayerState } from '../engine/gameState';

interface GameMapProps {
  campaign: CampaignBundle | null;
  player: PlayerState | null;
  onNodeClick: (nodeId: string) => void;
}

export const GameMap: React.FC<GameMapProps> = ({ campaign, player, onNodeClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current || !campaign) return;

    let isMounted = true;

    initMapRenderer({
      container: containerRef.current,
      mapData: campaign.map,
      buildings: campaign.buildings,
      assetBasePath: `/campaigns/${campaign.config.name}`,
      onNodeClick: (nodeId) => {
        onNodeClick(nodeId);
      }
    }).then((cleanup) => {
      if (!isMounted) {
        cleanup();
      } else {
        cleanupRef.current = cleanup;
      }
    });

    return () => {
      isMounted = false;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [campaign]);

  useEffect(() => {
    if (player && campaign) {
      const node = campaign.map.nodes.find(n => n.id === player.position);
      if (node) {
        movePlayerTo({
          nodeId: node.id,
          x: node.x,
          y: node.y
        });
      }
    }
  }, [player?.position, campaign]);

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
