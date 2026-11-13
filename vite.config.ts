import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_SHARE || process.env.VITE_STATIC ? './' : '/',
  // GitHub Pages hides files that start with «_» (Jekyll), and Vite names one chunk «__vite-browser-external».
  build: { rollupOptions: { output: { sanitizeFileName: (name) => name.replace(/^_+/, '').replace(/[^\w.-]/g, '-') } } },
})
