import { describe, it, expect } from 'vitest';
import { loadCampaign } from '../src/engine/dataLoader';

describe('Campaign Jobs Stability Snapshots', () => {
  it('matches snapshot for 1990_classic_cdrom jobs', async () => {
    const cdrom = await loadCampaign('1990_classic_cdrom');
    expect(cdrom.jobs).toMatchSnapshot();
  });

  it('matches snapshot for qol_improved jobs', async () => {
    const qol = await loadCampaign('qol_improved');
    expect(qol.jobs).toMatchSnapshot();
  });

  it('matches snapshot for advanced jobs', async () => {
    const adv = await loadCampaign('advanced');
    expect(adv.jobs).toMatchSnapshot();
  });

  it('verifies original floppy jobs reflect original Floppy SCI table', async () => {
    const floppy = await loadCampaign('1990_classic_floppy');
    expect(floppy.jobs).toHaveLength(37);

    // Verify jobs not in floppy
    expect(floppy.jobs.find(j => j.id === 'qt_janitor')).toBeUndefined();
    expect(floppy.jobs.find(j => j.id === 'socket_clerk')).toBeUndefined();

    // Verify floppy entry wage levels
    expect(floppy.jobs.find(j => j.id === 'burger_cook')?.baseWage).toBe(4);
    expect(floppy.jobs.find(j => j.id === 'burger_clerk')?.baseWage).toBe(5);
    expect(floppy.jobs.find(j => j.id === 'zmart_clerk')?.baseWage).toBe(4);
    expect(floppy.jobs.find(j => j.id === 'uni_janitor')?.baseWage).toBe(4);
    expect(floppy.jobs.find(j => j.id === 'blacks_janitor')?.baseWage).toBe(5);

    // Verify floppy janitor requirements
    const factoryJanitor = floppy.jobs.find(j => j.id === 'factory_janitor')!;
    expect(factoryJanitor.requirements.experience).toBe(30);
    expect(factoryJanitor.requirements.dependability).toBe(30);
    expect(factoryJanitor.baseWage).toBe(7);

    const bankJanitor = floppy.jobs.find(j => j.id === 'bank_janitor')!;
    expect(bankJanitor.requirements.experience).toBe(20);
    expect(bankJanitor.requirements.dependability).toBe(20);

    const groundskeeper = floppy.jobs.find(j => j.id === 'rent_groundskeeper')!;
    expect(groundskeeper.requirements.experience).toBe(20);
    expect(groundskeeper.requirements.dependability).toBe(20);
    expect(groundskeeper.baseWage).toBe(6);
  });

  it('verifies cdrom overrides restore cdrom-specific jobs and requirements', async () => {
    const cdrom = await loadCampaign('1990_classic_cdrom');
    expect(cdrom.jobs).toHaveLength(39);

    // CD-ROM specific jobs present
    expect(cdrom.jobs.find(j => j.id === 'qt_janitor')).toBeDefined();
    expect(cdrom.jobs.find(j => j.id === 'socket_clerk')).toBeDefined();

    // CD-ROM wages
    expect(cdrom.jobs.find(j => j.id === 'burger_cook')?.baseWage).toBe(5);
    expect(cdrom.jobs.find(j => j.id === 'burger_clerk')?.baseWage).toBe(6);
    expect(cdrom.jobs.find(j => j.id === 'zmart_clerk')?.baseWage).toBe(5);
    expect(cdrom.jobs.find(j => j.id === 'uni_janitor')?.baseWage).toBe(5);
    expect(cdrom.jobs.find(j => j.id === 'blacks_janitor')?.baseWage).toBe(6);

    // CD-ROM lowered janitor requirements
    const factoryJanitor = cdrom.jobs.find(j => j.id === 'factory_janitor')!;
    expect(factoryJanitor.requirements.experience).toBe(10);
    expect(factoryJanitor.requirements.dependability).toBe(20);

    const bankJanitor = cdrom.jobs.find(j => j.id === 'bank_janitor')!;
    expect(bankJanitor.requirements.experience).toBe(10);
    expect(bankJanitor.requirements.dependability).toBe(20);

    const groundskeeper = cdrom.jobs.find(j => j.id === 'rent_groundskeeper')!;
    expect(groundskeeper.requirements.experience).toBe(10);
    expect(groundskeeper.requirements.dependability).toBe(20);
    expect(groundskeeper.baseWage).toBe(7);
  });
});
