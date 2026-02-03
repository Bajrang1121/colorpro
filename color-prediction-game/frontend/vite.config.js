import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'public', // index.html yahan hai
  build: {
    // Ye 'frontend/dist' folder banayega
    outDir: '../dist', 
    emptyOutDir: true,
    rollupOptions: {
      input: 'public/index.html' // Explicitly path batana
    }
  }
})