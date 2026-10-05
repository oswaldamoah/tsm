import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted variable fonts: bundled with the app, no third-party request.
import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/bricolage-grotesque/opsz.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
