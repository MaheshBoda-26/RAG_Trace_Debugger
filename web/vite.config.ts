import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // The app shipped as one 474 KB chunk. Split vendor code so the
        // dashboard's route chunk and the landing page don't share weight.
        manualChunks(id: string) {
          if (id.includes('framer-motion')) return 'motion';
          if (/node_modules\/(react|react-dom|react-router|scheduler)\//.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
})
