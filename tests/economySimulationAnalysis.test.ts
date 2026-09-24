import { describe, it } from 'vitest';
import { loadCampaign } from '../src/engine/dataLoader';
import { createTestGameState } from '../src/engine/testFactories';
import { processEconomicTurnPhase } from '../src/engine/turn/economicTurnPhase';
import { Random } from '../src/utils/rng';

describe('Economic Simulation Turn-by-Turn Analysis', () => {
  async function runSimulation(campaignId: string, label: string, numGames = 5000, maxTurns = 50) {
    const campaign = await loadCampaign(campaignId);

    let hitFloorCount = 0; // hits -30
    const turnsToFloor: number[] = [];

    let hitSlump15Count = 0; // hits <= -15
    const turnsToSlump15: number[] = [];

    let hitSlump20Count = 0; // hits <= -20
    const turnsToSlump20: number[] = [];

    const readingByTurn: number[][] = Array.from({ length: maxTurns + 1 }, () => []);
    let totalCrashes = 0;
    let totalBooms = 0;
    let gamesWithCrash = 0;
    let gamesWithBoom = 0;

    for (let seed = 1; seed <= numGames; seed++) {
      const rng = new Random(seed);
      let state = createTestGameState(campaign, [{ name: 'Player1', isAi: false, goals: {} }], 'node_low_cost');
      state.turn = 1;

      let gameHitFloor = false;
      let gameHitSlump15 = false;
      let gameHitSlump20 = false;
      let gameHadCrash = false;
      let gameHadBoom = false;

      readingByTurn[1].push(state.economicIndex);

      for (let turn = 1; turn <= maxTurns; turn++) {
        state.turn = turn;
        const result = processEconomicTurnPhase(state, campaign, rng);

        state.economicIndex = result.newEconomy;
        state.economicTrend = result.newTrend;
        state.economySimulation = result.newEconomySimulation;

        if (turn + 1 <= maxTurns) {
          readingByTurn[turn + 1].push(state.economicIndex);
        }

        if (result.crashSeverity !== 'none') {
          totalCrashes++;
          gameHadCrash = true;
        }
        if (result.economicBoom) {
          totalBooms++;
          gameHadBoom = true;
        }

        if (!gameHitFloor && state.economicIndex <= -30) {
          gameHitFloor = true;
          turnsToFloor.push(turn);
        }
        if (!gameHitSlump20 && state.economicIndex <= -20) {
          gameHitSlump20 = true;
          turnsToSlump20.push(turn);
        }
        if (!gameHitSlump15 && state.economicIndex <= -15) {
          gameHitSlump15 = true;
          turnsToSlump15.push(turn);
        }
      }

      if (gameHitFloor) hitFloorCount++;
      if (gameHitSlump15) hitSlump15Count++;
      if (gameHitSlump20) hitSlump20Count++;
      if (gameHadCrash) gamesWithCrash++;
      if (gameHadBoom) gamesWithBoom++;
    }

    turnsToFloor.sort((a, b) => a - b);
    turnsToSlump15.sort((a, b) => a - b);
    turnsToSlump20.sort((a, b) => a - b);

    const median = (arr: number[]) => (arr.length === 0 ? 0 : arr[Math.floor(arr.length / 2)]);
    const avg = (arr: number[]) => (arr.length === 0 ? 0 : Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)));

    const bucketCounts = (arr: number[]) => {
      const b: Record<string, number> = {
        'Turns 1-3': 0,
        'Turns 4-7': 0,
        'Turns 8-12': 0,
        'Turns 13-20': 0,
        'Turns 21-30': 0,
        'Turns 31-50': 0,
      };
      for (const t of arr) {
        if (t <= 3) b['Turns 1-3']++;
        else if (t < 8) b['Turns 4-7']++;
        else if (t <= 12) b['Turns 8-12']++;
        else if (t <= 20) b['Turns 13-20']++;
        else if (t <= 30) b['Turns 21-30']++;
        else b['Turns 31-50']++;
      }
      return b;
    };

    return {
      label,
      campaignId,
      numGames,
      hitFloorCount,
      hitFloorPct: ((hitFloorCount / numGames) * 100).toFixed(1),
      floorMedianTurn: median(turnsToFloor),
      floorAvgTurn: avg(turnsToFloor),
      floorBuckets: bucketCounts(turnsToFloor),
      hitSlump20Count,
      hitSlump20Pct: ((hitSlump20Count / numGames) * 100).toFixed(1),
      slump20MedianTurn: median(turnsToSlump20),
      slump20AvgTurn: avg(turnsToSlump20),
      slump20Buckets: bucketCounts(turnsToSlump20),
      hitSlump15Count,
      hitSlump15Pct: ((hitSlump15Count / numGames) * 100).toFixed(1),
      slump15MedianTurn: median(turnsToSlump15),
      slump15AvgTurn: avg(turnsToSlump15),
      slump15Buckets: bucketCounts(turnsToSlump15),
      gamesWithCrashPct: ((gamesWithCrash / numGames) * 100).toFixed(1),
      totalCrashes,
      gamesWithBoomPct: ((gamesWithBoom / numGames) * 100).toFixed(1),
      totalBooms,
      readingByTurn,
      median,
      avg,
    };
  }

  it('compares 5,000 games of Classic CD-ROM (authentic typo) vs Advanced (upside bonus fix)', async () => {
    const cdrom = await runSimulation('1990_classic_cdrom', 'Classic CD-ROM (authentic typo: economicUpsideBonus=false)');
    const advanced = await runSimulation('advanced', 'Advanced Edition (fixed typo: economicUpsideBonus=true)');

    console.log('\n======================================================================');
    console.log('=== MONTE CARLO ECONOMIC SIMULATION COMPARISON (5,000 GAMES × 50 TURNS) ===');
    console.log('======================================================================');
    console.log(`\n1. HIT ABSOLUTE FLOOR (-30 / Reading 70):`);
    console.log(`  Classic CD-ROM: ${cdrom.hitFloorCount} / 5000 (${cdrom.hitFloorPct}%) | Median Turn: ${cdrom.floorMedianTurn} | Avg Turn: ${cdrom.floorAvgTurn}`);
    console.log(`  Advanced:       ${advanced.hitFloorCount} / 5000 (${advanced.hitFloorPct}%) | Median Turn: ${advanced.floorMedianTurn} | Avg Turn: ${advanced.floorAvgTurn}`);
    console.log('  Turn Breakdown to hit -30:');
    console.log('    Classic CD-ROM:', cdrom.floorBuckets);
    console.log('    Advanced:      ', advanced.floorBuckets);

    console.log(`\n2. HIT DEEP WAGE SLUMP (-20 / Wage $2-$3):`);
    console.log(`  Classic CD-ROM: ${cdrom.hitSlump20Count} / 5000 (${cdrom.hitSlump20Pct}%) | Median Turn: ${cdrom.slump20MedianTurn} | Avg Turn: ${cdrom.slump20AvgTurn}`);
    console.log(`  Advanced:       ${advanced.hitSlump20Count} / 5000 (${advanced.hitSlump20Pct}%) | Median Turn: ${advanced.slump20MedianTurn} | Avg Turn: ${advanced.slump20AvgTurn}`);
    console.log('  Turn Breakdown to hit -20:');
    console.log('    Classic CD-ROM:', cdrom.slump20Buckets);
    console.log('    Advanced:      ', advanced.slump20Buckets);

    console.log(`\n3. HIT MODERATE WAGE SLUMP (-15 / Wage $3):`);
    console.log(`  Classic CD-ROM: ${cdrom.hitSlump15Count} / 5000 (${cdrom.hitSlump15Pct}%) | Median Turn: ${cdrom.slump15MedianTurn} | Avg Turn: ${cdrom.slump15AvgTurn}`);
    console.log(`  Advanced:       ${advanced.hitSlump15Count} / 5000 (${advanced.hitSlump15Pct}%) | Median Turn: ${advanced.slump15MedianTurn} | Avg Turn: ${advanced.slump15AvgTurn}`);
    console.log('  Turn Breakdown to hit -15:');
    console.log('    Classic CD-ROM:', cdrom.slump15Buckets);
    console.log('    Advanced:      ', advanced.slump15Buckets);

    console.log(`\n4. CRASHES & BOOMS:`);
    console.log(`  Classic CD-ROM: Crashes: ${cdrom.gamesWithCrashPct}% of games (${cdrom.totalCrashes} total) | Booms: ${cdrom.gamesWithBoomPct}% (${cdrom.totalBooms} total)`);
    console.log(`  Advanced:       Crashes: ${advanced.gamesWithCrashPct}% of games (${advanced.totalCrashes} total) | Booms: ${advanced.gamesWithBoomPct}% (${advanced.totalBooms} total)`);

    console.log('\n5. ECONOMIC INDEX TRAJECTORY (Average / Median):');
    console.log('  Turn | Classic CD-ROM (Avg / Med) | Advanced (Avg / Med)');
    console.log('  ---------------------------------------------------------');
    for (const t of [1, 2, 3, 5, 8, 10, 15, 20, 30, 40, 50]) {
      const cdReadings = cdrom.readingByTurn[t] || [];
      const advReadings = advanced.readingByTurn[t] || [];
      const cdAvg = cdrom.avg(cdReadings).toString().padStart(6, ' ');
      const cdMed = cdrom.median(cdReadings).toString().padStart(4, ' ');
      const advAvg = advanced.avg(advReadings).toString().padStart(6, ' ');
      const advMed = advanced.median(advReadings).toString().padStart(4, ' ');
      console.log(`   ${t.toString().padStart(2, ' ')}  |   ${cdAvg}  /  ${cdMed}       |   ${advAvg}  /  ${advMed}`);
    }
    console.log('======================================================================\n');
  }, 30000);
});
