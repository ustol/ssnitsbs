import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Leaflet is loaded from CDN in index.html to avoid Rolldown CJS resolution issues.
  // Mark it as external so the bundler emits `L` references instead of trying to bundle it.
  build: {
    rollupOptions: {
      external: ['leaflet'],
      output: {
        globals: { leaflet: 'L' },
      },
    },
  },
})
