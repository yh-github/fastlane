import { describe, it, expect } from 'vitest';
import { loadCampaign } from '../src/engine/dataLoader';

const LEGACY_CAMPAIGNS = ['1990_classic_floppy', '1990_classic_cdrom', 'qol_improved', 'advanced'] as const;

describe('Legacy Campaigns Golden Snapshots (Zero-Regression Guardrail)', () => {
  for (const campaignId of LEGACY_CAMPAIGNS) {
    describe(`Campaign: ${campaignId}`, () => {
      it(`matches snapshot for ${campaignId} items`, async () => {
        const campaign = await loadCampaign(campaignId);
        expect(campaign.items).toMatchSnapshot();
      });

      it(`matches snapshot for ${campaignId} synergies`, async () => {
        const campaign = await loadCampaign(campaignId);
        expect(campaign.synergies).toMatchSnapshot();
      });

      it(`matches snapshot for ${campaignId} education`, async () => {
        const campaign = await loadCampaign(campaignId);
        expect(campaign.education).toMatchSnapshot();
      });

      it(`matches snapshot for ${campaignId} housing`, async () => {
        const campaign = await loadCampaign(campaignId);
        expect(campaign.housing).toMatchSnapshot();
      });

      it(`matches snapshot for ${campaignId} buildings`, async () => {
        const campaign = await loadCampaign(campaignId);
        expect(campaign.buildings).toMatchSnapshot();
      });

      it(`matches snapshot for ${campaignId} config`, async () => {
        const campaign = await loadCampaign(campaignId);
        expect(campaign.config).toMatchSnapshot();
      });
    });
  }
});
