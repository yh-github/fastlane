import { describe, it, expect } from 'vitest';
import { loadCampaign } from './dataLoader';

describe('dataLoader', () => {
  it('should handle optional files that do not exist (fallback to HTML issue)', async () => {
    // Attempting to load a campaign that has missing optional files
    // Assuming '1990_classic_floppy' has missing optional files like synergies.json
    // Or we can just load qol_improved which is a delta
    await expect(loadCampaign('qol_improved')).resolves.toBeDefined();
  });

  it('loads floppy campaign with helpfulUI false and enableAnimations false', async () => {
    const floppy = await loadCampaign('1990_classic_floppy');
    expect(floppy.config.gameRules?.helpfulUI).toBe(false);
    expect(floppy.config.gameRules?.enableAnimations).toBe(false);
    expect(floppy.config.gameRules?.turnStartAtHome).toBe(false);
  });

  it('loads cdrom campaign inheriting floppy settings', async () => {
    const cdrom = await loadCampaign('1990_classic_cdrom');
    expect(cdrom.config.gameRules?.helpfulUI).toBe(false);
    expect(cdrom.config.gameRules?.enableAnimations).toBe(false);
    expect(cdrom.config.gameRules?.turnStartAtHome).toBe(false);
  });

  it('loads qol_improved campaign with expected rule overrides', async () => {
    const qol = await loadCampaign('qol_improved');
    expect(qol.config.gameRules?.helpfulUI).toBe(true);
    expect(qol.config.gameRules?.enableAnimations).toBe(true);
    expect(qol.config.gameRules?.strictEviction).toBe(false);
    expect(qol.config.gameRules?.showItemImages).toBe(true);
    expect(qol.config.gameRules?.bypassDoctorIfBroke).toBe(true);
    expect(qol.config.gameRules?.reducedDegreeStatBonus).toBe(true);
    expect(qol.config.gameRules?.turnStartAtHome).toBe(false);
  });

  it('loads advanced campaign inheriting qol_improved base settings with advanced rule overrides', async () => {
    const advanced = await loadCampaign('advanced');
    expect(advanced.config.baseCampaign).toBe('qol_improved');
    expect(advanced.config.gameRules?.helpfulUI).toBe(true);
    expect(advanced.config.gameRules?.enableAnimations).toBe(true);
    expect(advanced.config.gameRules?.showItemImages).toBe(true);
    expect(advanced.config.gameRules?.strictEviction).toBe(true);
    expect(advanced.config.gameRules?.clothingDecaysAll).toBe(false);
    expect(advanced.config.gameRules?.bypassDoctorIfBroke).toBe(false);
    expect(advanced.config.gameRules?.enableRelaxationDoctor).toBe(false);
    expect(advanced.config.statRules?.physicalDoctorThreshold).toBe(10);
    expect(advanced.config.statRules?.lowSpiritsThreshold).toBe(10);
    expect(advanced.config.gameRules?.reducedDegreeStatBonus).toBe(true);
    expect(advanced.config.gameRules?.turnStartAtHome).toBe(true);
    // Verify base items from floppy/cdrom/qol are inherited
    expect(advanced.items.length).toBeGreaterThan(0);
    expect(advanced.jobs.length).toBeGreaterThan(0);
  });
});
