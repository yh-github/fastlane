import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { TitleScreen } from '../src/ui/TitleScreen';

const mockCampaigns = [
  { id: 'qol_improved', name: 'QoL Improved (Recommended)', description: 'QoL campaign' },
];

vi.mock('../src/engine/dataLoader', () => ({
  getAvailableCampaigns: () => mockCampaigns,
  loadAvailableCampaigns: async () => mockCampaigns,
}));

const rootDir = path.resolve(__dirname, '..');

describe('PWA Configuration & Install Flow', () => {
  it('provides a complete web app manifest with existing raster and maskable icons', () => {
    const manifestPath = path.join(rootDir, 'public', 'manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.id).toBe('/');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('fullscreen');
    expect(manifest.display_override).toContain('standalone');

    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');

    const maskable = manifest.icons.find((i: { purpose?: string }) => i.purpose === 'maskable');
    expect(maskable).toBeDefined();

    for (const icon of manifest.icons) {
      const iconDiskPath = path.join(rootDir, 'public', icon.src.replace(/^\//, ''));
      expect(fs.existsSync(iconDiskPath)).toBe(true);
    }
  });

  it('includes iOS/PWA meta tags and apple-touch-icon in index.html', () => {
    const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    expect(html).toContain('rel="manifest" href="/manifest.json"');
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain('name="theme-color"');
    expect(html).toContain('name="apple-mobile-web-app-capable"');
    expect(fs.existsSync(path.join(rootDir, 'public', 'apple-touch-icon.png'))).toBe(true);
  });

  it('provides service worker and Vercel caching config', () => {
    expect(fs.existsSync(path.join(rootDir, 'public', 'sw.js'))).toBe(true);
    const vercelConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'vercel.json'), 'utf8'));
    expect(vercelConfig.outputDirectory).toBe('dist');
    const swHeaderRule = vercelConfig.headers.find((h: { source: string }) => h.source === '/sw.js');
    expect(swHeaderRule).toBeDefined();
  });

  it('reveals Install App button on TitleScreen when beforeinstallprompt fires', async () => {
    render(<TitleScreen onStartGame={() => {}} />);
    expect(screen.queryByTestId('btn-install-pwa')).not.toBeInTheDocument();

    const promptMock = vi.fn().mockResolvedValue(undefined);
    const promptEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    };
    promptEvent.prompt = promptMock;
    promptEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

    act(() => {
      window.dispatchEvent(promptEvent);
    });

    const installBtn = await screen.findByTestId('btn-install-pwa');
    expect(installBtn).toBeInTheDocument();

    fireEvent.click(installBtn);
    await waitFor(() => {
      expect(promptMock).toHaveBeenCalledTimes(1);
    });
  });
});
