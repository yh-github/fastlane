import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { loadCampaign, getAvailableCampaigns, loadAvailableCampaigns } from './dataLoader';

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
    expect(floppy.hasCannedFood).toBe(false);
  });

  it('loads cdrom campaign inheriting floppy settings', async () => {
    const cdrom = await loadCampaign('1990_classic_cdrom');
    expect(cdrom.config.gameRules?.helpfulUI).toBe(false);
    expect(cdrom.config.gameRules?.enableAnimations).toBe(false);
    expect(cdrom.config.gameRules?.turnStartAtHome).toBe(false);
    expect(cdrom.hasCannedFood).toBe(false);
  });

  it('loads qol_improved campaign with expected rule overrides', async () => {
    const qol = await loadCampaign('qol_improved');
    expect(qol.config.gameRules?.helpfulUI).toBe(true);
    expect(qol.config.gameRules?.enableAnimations).toBe(true);
    expect(qol.config.gameRules?.strictEviction).toBe(false);
    expect(qol.config.gameRules?.showItemImages).toBe(true);
    expect(qol.config.gameRules?.bypassDoctorIfBroke).toBe(true);
    expect(qol.config.gameRules?.reducedDegreeStatBonus).toBe(false);
    expect(qol.config.gameRules?.turnStartAtHome).toBe(false);
    expect(qol.hasCannedFood).toBe(false);
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
    expect(advanced.config.gameRules?.reducedDegreeStatBonus).toBe(false);
    expect(advanced.config.gameRules?.turnStartAtHome).toBe(true);
    expect(advanced.hasCannedFood).toBe(true);
    // Verify base items from floppy/cdrom/qol are inherited
    expect(advanced.items.length).toBeGreaterThan(0);
    expect(advanced.jobs.length).toBeGreaterThan(0);
  });

  it('loads available campaigns from campaigns.json manifest', async () => {
    const list = getAvailableCampaigns();
    expect(list.length).toBe(4);
    expect(list.map(c => c.id)).toEqual(['1990_classic_floppy', '1990_classic_cdrom', 'qol_improved', 'advanced']);
    
    const asyncList = await loadAvailableCampaigns();
    expect(asyncList.length).toBe(4);
    expect(asyncList[0].id).toBe('1990_classic_floppy');
  });

  it('keeps src/campaigns/campaigns.json and public/campaigns/campaigns.json in sync', () => {
    const srcCampaigns = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../campaigns/campaigns.json'), 'utf-8'));
    const publicCampaigns = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../public/campaigns/campaigns.json'), 'utf-8'));
    expect(srcCampaigns).toEqual(publicCampaigns);
  });

  it('loads discount_and_pawn in advanced campaign with used clothes and durability overrides', async () => {
    const advanced = await loadCampaign('advanced');
    const discountShop = advanced.buildings.find(b => b.id === 'discount_and_pawn');
    expect(discountShop).toBeDefined();

    const casual = discountShop?.inventory?.find(i => i.itemId === 'casual_clothes');
    expect(casual).toMatchObject({
      itemId: 'casual_clothes',
      priceOverride: 35,
      weeksOverride: 7,
      nameOverride: 'Used Casual Clothes'
    });

    const dress = discountShop?.inventory?.find(i => i.itemId === 'dress_clothes');
    expect(dress).toMatchObject({
      itemId: 'dress_clothes',
      priceOverride: 90,
      weeksOverride: 7,
      nameOverride: 'Used Dress Clothes'
    });

    const business = discountShop?.inventory?.find(i => i.itemId === 'business_suit');
    expect(business).toMatchObject({
      itemId: 'business_suit',
      priceOverride: 100,
      weeksOverride: 3,
      nameOverride: 'Used Business Suit',
      happinessBonusOverride: 0
    });
  });

  it('preserves floppy campaign z_mart clothes without used overrides', async () => {
    const floppy = await loadCampaign('1990_classic_floppy');
    const zMart = floppy.buildings.find(b => b.id === 'z_mart');
    const casual = zMart?.inventory?.find(i => i.itemId === 'casual_clothes');
    expect(casual?.weeksOverride).toBeUndefined();
    expect(casual?.nameOverride).toBeUndefined();
    expect(casual?.priceOverride).toBe(35);

    const businessInZMart = zMart?.inventory?.find(i => i.itemId === 'business_suit');
    expect(businessInZMart).toBeUndefined();
  });
});
