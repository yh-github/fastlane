/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
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
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts']
  }
})
