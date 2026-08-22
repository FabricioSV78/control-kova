import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const buildEnv = loadEnv(mode, process.cwd(), '')

  if (process.env.CF_PAGES === '1') {
    const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const
    const missing = required.filter((key) => !buildEnv[key]?.trim())
    if (missing.length) throw new Error(`Faltan variables de Cloudflare Pages: ${missing.join(', ')}`)
    if (buildEnv.VITE_ENABLE_DEMO_MODE !== 'false') {
      throw new Error('VITE_ENABLE_DEMO_MODE debe ser false en Cloudflare Pages.')
    }
  }

  return {
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
  }
})
