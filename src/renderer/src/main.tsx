import './assets/main.css'
import './assets/rich-text-quote.css'
import './assets/focus-mode.css'
import './assets/light-theme.css'
import './assets/light-theme-components.css'
import './assets/light-theme-final-details.css'
import './assets/board-visual-polish.css'
import './assets/board-toolbar-design.css'
import './assets/tooltip-design.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
