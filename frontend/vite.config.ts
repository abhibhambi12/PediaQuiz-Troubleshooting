import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Ensure this resolves correctly from the project root
      '@': path.resolve(__dirname, './src'), 
    },
  },
})