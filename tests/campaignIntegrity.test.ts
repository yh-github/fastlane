import { describe, it, expect } from 'vitest';
import { loadCampaign, type CampaignBundle, type MapNode } from '../src/engine/dataLoader';
import { buildAdjacencyMap, findShortestPath } from '../src/graphics/pathfinding';

const CAMPAIGN_IDS = ['1990_classic_floppy', '1990_classic_cdrom', 'qol_improved', 'advanced'];

describe('Campaign Referential & Structural Integrity Audit', () => {
  CAMPAIGN_IDS.forEach((campaignId) => {
    describe(`Campaign: ${campaignId}`, () => {
      let campaign: CampaignBundle;

      it('loads campaign bundle without errors', async () => {
        campaign = await loadCampaign(campaignId);
        expect(campaign).toBeDefined();
        expect(campaign.config).toBeDefined();
        expect(campaign.config.name).toBeTruthy();
        expect(campaign.map.nodes.length).toBeGreaterThan(0);
        expect(campaign.items.length).toBeGreaterThan(0);
        expect(campaign.jobs.length).toBeGreaterThan(0);
        expect(campaign.housing.length).toBeGreaterThan(0);
      });

      it('verifies map nodes, bidirectional connectivity, and full graph reachability', async () => {
        if (!campaign) campaign = await loadCampaign(campaignId);
        const nodes = campaign.map.nodes;
        const nodeMap = new Map<string, MapNode>();
        nodes.forEach((n) => nodeMap.set(n.id, n));

        // 1. All nodes have unique IDs and coordinates
        expect(nodeMap.size).toBe(nodes.length);
        for (const node of nodes) {
          expect(node.id).toBeTruthy();
          expect(typeof node.x).toBe('number');
          expect(typeof node.y).toBe('number');
          expect(Array.isArray(node.connections)).toBe(true);
          expect(node.connections.length).toBeGreaterThan(0);

          // 2. Symmetry check: A -> B implies B -> A
          for (const targetId of node.connections) {
            const targetNode = nodeMap.get(targetId);
            expect(targetNode, `Node "${node.id}" connects to non-existent node "${targetId}"`).toBeDefined();
            expect(
              targetNode?.connections.includes(node.id),
              `Asymmetric edge detected: "${node.id}" -> "${targetId}" exists, but "${targetId}" does not connect back to "${node.id}"`
            ).toBe(true);
          }
        }

        // 3. Graph reachability: all nodes connected in a single component
        const adj = buildAdjacencyMap(nodes);
        const startNode = nodes[0].id;
        for (const targetNode of nodes) {
          const pathRes = findShortestPath(adj, startNode, targetNode.id);
          expect(pathRes.found, `Node "${targetNode.id}" is unreachable from "${startNode}"`).toBe(true);
        }
      });

      it('verifies housing definitions and homeNodeId mappings', async () => {
        if (!campaign) campaign = await loadCampaign(campaignId);
        const nodeIds = new Set(campaign.map.nodes.map((n) => n.id));

        for (const house of campaign.housing) {
          expect(house.id).toBeTruthy();
          expect(house.name).toBeTruthy();
          expect(house.baseRent).toBeGreaterThanOrEqual(0);
          expect(
            nodeIds.has(house.homeNodeId),
            `Housing "${house.id}" points to non-existent homeNodeId "${house.homeNodeId}"`
          ).toBe(true);
        }
      });

      it('verifies building catalog and store item references with prices > 0', async () => {
        if (!campaign) campaign = await loadCampaign(campaignId);
        const itemIds = new Set(campaign.items.map((i) => i.id));
        const buildingIds = new Set(campaign.buildings.map((b) => b.id));

        // Verify buildings on map exist in buildings list
        for (const node of campaign.map.nodes) {
          if (node.buildingId) {
            expect(
              buildingIds.has(node.buildingId),
              `Map node "${node.id}" references non-existent buildingId "${node.buildingId}"`
            ).toBe(true);
          }
        }

        // Verify store inventories
        for (const building of campaign.buildings) {
          expect(building.id).toBeTruthy();
          expect(building.name).toBeTruthy();

          if (building.inventory) {
            for (const inv of building.inventory) {
              expect(
                itemIds.has(inv.itemId),
                `Building "${building.id}" inventory contains invalid itemId "${inv.itemId}"`
              ).toBe(true);

              const baseItem = campaign.items.find((i) => i.id === inv.itemId);
              const effectivePrice = inv.priceOverride ?? baseItem?.basePrice ?? 0;
              expect(
                effectivePrice,
                `Item "${inv.itemId}" in "${building.id}" has invalid price ${effectivePrice}`
              ).toBeGreaterThan(0);
            }
          }
        }
      });

      it('verifies item catalog integrity', async () => {
        if (!campaign) campaign = await loadCampaign(campaignId);
        const seenIds = new Set<string>();

        for (const item of campaign.items) {
          expect(item.id).toBeTruthy();
          expect(seenIds.has(item.id), `Duplicate item ID found: "${item.id}"`).toBe(false);
          seenIds.add(item.id);

          expect(item.name).toBeTruthy();
          expect(item.category).toBeTruthy();
          expect(item.basePrice, `Item "${item.id}" has non-positive basePrice: ${item.basePrice}`).toBeGreaterThan(0);
        }
      });

      it('verifies job definitions and building references', async () => {
        if (!campaign) campaign = await loadCampaign(campaignId);
        const buildingIds = new Set(campaign.buildings.map((b) => b.id));
        const degreeIds = new Set(campaign.education.map((d) => d.id));

        for (const job of campaign.jobs) {
          expect(job.id).toBeTruthy();
          expect(job.title).toBeTruthy();
          expect(job.baseWage).toBeGreaterThan(0);

          const locId = job.locationId || (job as any).buildingId;
          expect(
            buildingIds.has(locId),
            `Job "${job.id}" references non-existent locationId "${locId}"`
          ).toBe(true);

          if (job.requirements?.degrees) {
            for (const degId of job.requirements.degrees) {
              expect(
                degreeIds.has(degId),
                `Job "${job.id}" requires non-existent degree "${degId}"`
              ).toBe(true);
            }
          }
        }
      });

      it('verifies education DAG has valid prerequisites and no circular dependencies', async () => {
        if (!campaign) campaign = await loadCampaign(campaignId);
        const degreeMap = new Map(campaign.education.map((d) => [d.id, d]));

        for (const degree of campaign.education) {
          expect(degree.id).toBeTruthy();
          expect(degree.name).toBeTruthy();
          expect(degree.baseTuitionFee).toBeGreaterThan(0);
          expect(degree.lessonsRequired).toBeGreaterThan(0);

          // Check prerequisites exist
          if (degree.prerequisites) {
            for (const prereqId of degree.prerequisites) {
              expect(
                degreeMap.has(prereqId),
                `Degree "${degree.id}" has invalid prereq "${prereqId}"`
              ).toBe(true);
            }
          }
        }

        // Cycle detection via DFS
        const visited = new Set<string>();
        const inStack = new Set<string>();

        function checkCycle(degId: string) {
          visited.add(degId);
          inStack.add(degId);

          const deg = degreeMap.get(degId);
          if (deg?.prerequisites) {
            for (const p of deg.prerequisites) {
              if (!visited.has(p)) {
                checkCycle(p);
              } else if (inStack.has(p)) {
                throw new Error(`Circular prerequisite cycle detected involving "${degId}" and "${p}"`);
              }
            }
          }
          inStack.delete(degId);
        }

        for (const deg of campaign.education) {
          if (!visited.has(deg.id)) {
            checkCycle(deg.id);
          }
        }
      });

      it('verifies weekend ticket items exist in catalog', async () => {
        if (!campaign) campaign = await loadCampaign(campaignId);
        const itemIds = new Set(campaign.items.map((i) => i.id));

        if (campaign.weekends?.ticketWeekends) {
          for (const [wId, ticketRef] of Object.entries(campaign.weekends.ticketWeekends)) {
            const itemId = typeof ticketRef === 'string' ? ticketRef : (ticketRef as any).itemId;
            if (itemId) {
              expect(
                itemIds.has(itemId),
                `Ticket weekend "${wId}" references non-existent item "${itemId}"`
              ).toBe(true);
            }
          }
        }
      });
    });
  });
});
