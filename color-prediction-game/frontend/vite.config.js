import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'public', // Ye Vite ko bolega ki index.html 'public' folder mein hai
  build: {
    outDir: '../dist', // Build ko wapas frontend/dist mein bhejne ke liye
    emptyOutDir: true,
  }
})