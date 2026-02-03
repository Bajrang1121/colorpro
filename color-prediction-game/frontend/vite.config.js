import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  // Vite ko bata rahe hain ki index.html 'public' folder mein hai
  root: 'public',
  build: {
    // Build folder ko wapas 'frontend/dist' mein bhejne ke liye
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      // Manual entry point definition
      input: resolve(__dirname, 'public/index.html'),
    },
  },
})