import { describe, it, expect, beforeEach } from 'vitest';
import { loadCampaign, type CampaignBundle } from '../src/engine/dataLoader';
import { createPlayerState, createDefaultGoalAllotment } from '../src/engine/stateFactories';
import { workShift } from '../src/engine/job/jobShiftExecution';
import { calcWorkShiftSummary } from '../src/engine/job/jobShiftSummary';
import type { AdvancedStatRules } from '../src/engine/rules';

describe('Advanced 2000 Work & Risk Revamp (Phase 1)', () => {
  let campaign2000: CampaignBundle;
  let campaignAdvanced90s: CampaignBundle;
  let campaignFloppy: CampaignBundle;

  beforeEach(async () => {
    campaign2000 = await loadCampaign('advanced_2000');
    campaignAdvanced90s = await loadCampaign('advanced');
    campaignFloppy = await loadCampaign('1990_classic_floppy');
  });

  it('enables work revamp rules and mistake stat overrides strictly in advanced_2000 (not Advanced 90s or Classic)', () => {
    expect(campaign2000.config.gameRules.nerfFrontlineSocial).toBe(true);
    expect(campaign2000.config.gameRules.enableSoulCrushingJobs).toBe(true);
    expect(campaign2000.config.gameRules.enableInitiativeRevamp).toBe(true);

    const sr2000 = campaign2000.config.statRules as AdvancedStatRules;
    expect(sr2000.workMistakeGrindThresholdBonus).toBe(5);
    expect(sr2000.workMistakeOvertimeThresholdBonus).toBe(10);
    expect(sr2000.workMistakeNewJobExpMargin).toBe(10);
    expect(sr2000.workMistakeNewJobExpChancePerPoint).toBe(0.003);

    expect(campaignAdvanced90s.config.gameRules.nerfFrontlineSocial).toBeFalsy();
    expect(campaignAdvanced90s.config.gameRules.enableSoulCrushingJobs).toBeFalsy();
    expect(campaignAdvanced90s.config.gameRules.enableInitiativeRevamp).toBeFalsy();

    expect(campaignFloppy.config.gameRules.nerfFrontlineSocial).toBeFalsy();
    expect(campaignFloppy.config.gameRules.enableSoulCrushingJobs).toBeFalsy();
    expect(campaignFloppy.config.gameRules.enableInitiativeRevamp).toBeFalsy();
  });

  it('runs soul-crushing cap, nerfed frontline Social, Grind escalation, and rushed Show Leadership together in advanced_2000', () => {
    const zmartClerk = campaign2000.jobs.find(j => j.id === 'zmart_clerk')!;
    expect(zmartClerk).toBeDefined();

    const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_low_cost', campaign2000.config);
    player.currentJobId = zmartClerk.id;
    player.currentWage = zmartClerk.baseWage;
    player.experience = 20; // At base cap (10 + 10) -> soul-crushing AND eligible for Show Leadership
    player.dependability = 20;
    player.physicalCondition = 50;
    player.mentalCondition = 50;
    player.social = 30;
    player.hoursRemaining = 60;

    // Shift 1: frontline_service gives 0 Social, soul-crushing gives -1 Mental
    const s1 = workShift(player, zmartClerk, 6, campaign2000.config.gameRules, campaign2000.config.statRules, 'work_work');
    expect(s1.updated.social).toBe(30);
    expect(s1.updated.mentalCondition).toBe(49);

    // Summary on Grind shift 4 shows escalated physical threshold (18 + 5 = 23) and Stagnant badge
    const grindSummary = calcWorkShiftSummary(
      { ...player, workActionsThisTurn: 3, physicalCondition: 21, hoursRemaining: 3 },
      zmartClerk,
      6,
      campaign2000.config.gameRules,
      campaign2000.config.statRules,
      campaign2000.education,
      campaign2000
    );
    const ww = grindSummary.modes.find(m => m.id === 'work_work')!;
    expect(ww.modifierBreakdown?.mistakeBreakdown?.find(b => b.type === 'physical')?.threshold).toBe(23);
    expect(ww.modifiers?.map(b => b.label)).toContain('-0.5 🧠 Stagnant');

    const si = grindSummary.modes.find(m => m.id === 'show_initiative')!;
    expect(si.modifiers?.map(b => b.label)).toContain('⚠️ Rushed (3/6h)');
  });
});
