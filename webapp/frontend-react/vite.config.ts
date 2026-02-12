import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 4200,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://scrutiny-backend:8080',
        changeOrigin: true,
      },
    },
  },
  base: mode === 'production' ? '/web/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
}))
