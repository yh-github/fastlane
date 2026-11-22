/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function collectRelativeFiles(baseDir: string, currentDir = baseDir): string[] {
  if (!fs.existsSync(currentDir)) return [];
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectRelativeFiles(baseDir, fullPath));
    } else if (entry.isFile()) {
      const rel = '/' + path.relative(baseDir, fullPath).split(path.sep).join('/');
      results.push(rel);
    }
  }
  return results.sort();
}

function fastlanePwaPlugin(): Plugin {
  let outDir = 'dist';
  return {
    name: 'fastlane-pwa-sw',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const swPath = path.join(outDir, 'sw.js');
      if (!fs.existsSync(swPath)) return;

      const allFiles = collectRelativeFiles(outDir);
      const precacheUrls: string[] = ['/'];
      const mediaUrls: string[] = [];
      const hash = crypto.createHash('sha256');

      for (const relUrl of allFiles) {
        if (relUrl === '/sw.js') continue;
        const isDeferredMedia =
          relUrl.startsWith('/assets/authentic/') ||
          relUrl.startsWith('/assets/chars/') ||
          relUrl.startsWith('/assets/raw_images/');

        if (isDeferredMedia) {
          mediaUrls.push(relUrl);
        } else {
          precacheUrls.push(relUrl);
          const diskPath = path.join(outDir, relUrl.slice(1));
          hash.update(relUrl);
          hash.update(fs.readFileSync(diskPath));
        }
      }

      const buildHash = hash.digest('hex').slice(0, 12);
      let swSource = fs.readFileSync(swPath, 'utf8');
      swSource = swSource
        .replace(
          /\/\* __FASTLANE_BUILD_HASH__ \*\/ '[^']*'/,
          () => JSON.stringify(buildHash)
        )
        .replace(
          /\/\* __FASTLANE_PRECACHE_URLS__ \*\/ \[[\s\S]*?\]/,
          () => JSON.stringify(precacheUrls, null, 2)
        )
        .replace(
          /\/\* __FASTLANE_MEDIA_URLS__ \*\/ \[[\s\S]*?\]/,
          () => JSON.stringify(mediaUrls, null, 2)
        );

      fs.writeFileSync(swPath, swSource, 'utf8');
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    fastlanePwaPlugin(),
  ],
  publicDir: 'public',
  server: {
    fs: {
      allow: ['.'],
    },
  },
  resolve: {
    alias: {
      '@engine': path.resolve(__dirname, 'src/engine'),
      '@graphics': path.resolve(__dirname, 'src/graphics'),
      '@ui': path.resolve(__dirname, 'src/ui'),
    },
  },
  // Copy campaigns into the build output
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  // @ts-ignore
  test: {
    globals: true,
    exclude: ['tests/e2e/**', 'node_modules/**'],
    environmentMatchGlobs: [
      ['**/*.test.tsx', 'jsdom']
    ],
    setupFiles: ['./src/setupTests.ts']
  }
});
