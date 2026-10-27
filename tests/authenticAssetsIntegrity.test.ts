import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Authentic GUI Asset Integrity & Alignment Tests', () => {
  it('executes python verification verifying 100% door alignment, 9x8 marbles, and roof patch', () => {
    const scriptPath = path.resolve(__dirname, '../scripts/test_authentic_assets_integrity.py');
    const result = execSync(`python3 "${scriptPath}"`, { encoding: 'utf-8' });
    expect(result).toContain('ALL AUTHENTIC ASSET INTEGRITY TESTS PASSED SUCCESSFULLY');
    expect(result).toContain('All 4 marbles verified: 9x8 spherical with transparent corners');
    expect(result).toContain('All 13 building doors match background 100.0% pixel-perfect');
    expect(result).toContain('Roof patch verified: 95.1% match at y=139');
    expect(result).toContain('All 3 rooftop occluders match background 100.0% pixel-perfect');
    expect(result).toContain('All 170 waypoints and 13 building sidewalk destinations verified 100.0% authentic');
    expect(result).toContain('All 10 remaining authentic building locations verified 100.0% authentic.');
  });

  it('validates occluders JSON and binary existence', () => {
    const occJsonPath = path.resolve(__dirname, '../public/assets/authentic/occluders.json');
    expect(fs.existsSync(occJsonPath)).toBe(true);
    const meta = JSON.parse(fs.readFileSync(occJsonPath, 'utf-8'));
    for (const [name, spec] of Object.entries<any>(meta)) {
      const p = path.resolve(__dirname, `../public/assets/authentic/occluders/${name}.png`);
      expect(fs.existsSync(p)).toBe(true);
      const buf = fs.readFileSync(p);
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      expect(width).toBe(spec.w);
      expect(height).toBe(spec.h);
    }
  });

  it('validates marble file binary headers directly in Node', () => {
    for (let c = 0; c < 4; c++) {
      const p = path.resolve(__dirname, `../public/assets/authentic/marbles/marble_${c}.png`);
      const buf = fs.readFileSync(p);
      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50);
      // IHDR chunk: width at 16..19, height at 20..23
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      expect(width).toBe(9);
      expect(height).toBe(8);
    }
  });

  it('validates roof patch binary header is 183x25', () => {
    const p = path.resolve(__dirname, '../public/assets/authentic/roof_patch.png');
    const buf = fs.readFileSync(p);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    expect(width).toBe(183);
    expect(height).toBe(25);
  });
});
