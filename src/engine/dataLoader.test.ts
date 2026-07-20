import { describe, it, expect } from 'vitest';
import { loadCampaign } from './dataLoader';

describe('dataLoader', () => {
  it('should handle optional files that do not exist (fallback to HTML issue)', async () => {
    // Attempting to load a campaign that has missing optional files
    // Assuming '1990_classic_floppy' has missing optional files like synergies.json
    // Or we can just load qol_improved which is a delta
    await expect(loadCampaign('qol_improved')).resolves.toBeDefined();
  });
});
