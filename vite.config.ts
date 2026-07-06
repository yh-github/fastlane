import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Serve /campaigns as static files during dev
    {
      name: 'serve-campaigns',
      configureServer(server) {
        server.middlewares.use('/campaigns', (req, _res, next) => {
          // Let Vite's static file serving handle it from the campaigns dir
          req.url = req.url || '/';
          next();
        });
      },
    },
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
})
