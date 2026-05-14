import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: '../static/dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/upload':   'http://localhost:5000',
      '/status':   'http://localhost:5000',
      '/download': 'http://localhost:5000',
      '/cleanup':  'http://localhost:5000',
    },
  },
})
