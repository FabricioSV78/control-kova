import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app/App'
import { AppProviders } from './app/AppProviders'
import { registerKovaServiceWorker } from './services/notifications'
import './styles/index.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('No se encontró el contenedor principal de KOVA Control.')
}

window.addEventListener('load', () => {
  void registerKovaServiceWorker().catch((reason: unknown) => {
    console.error('No se pudo registrar la PWA de KOVA.', reason)
  })
})

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
)
