import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  preview: { port: 4173 },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'charts', test: /node_modules[\\/](recharts|d3-|victory-vendor)/ },
            { name: 'supabase', test: /node_modules[\\/]@supabase/ },
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|react-router)/ },
          ],
        },
      },
    },
  },
})
