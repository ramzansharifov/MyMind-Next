import './assets/main.css'
import './assets/rich-text-quote.css'
import './assets/focus-mode.css'
import './assets/light-theme.css'
import './assets/light-theme-components.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
