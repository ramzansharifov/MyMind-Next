import './assets/main.css'
import './assets/rich-text-quote.css'
import './assets/focus-mode.css'
import './assets/light-theme.css'
import './assets/light-theme-components.css'
import './assets/light-theme-final-details.css'
import './assets/board-visual-polish.css'
import './assets/board-toolbar-design.css'
import './assets/tooltip-design.css'
import './assets/module-sidebar-design.css'
import './assets/board-canvas-layout.css'
import './assets/notes-home-header.css'
import './assets/finance-home-header.css'
import './assets/module-home-header-unification.css'
import './assets/workouts-filters.css'
import './assets/app-titlebar.css'
import 'react-toastify/dist/ReactToastify.css'
import './assets/toast-notifications.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AppToastNotifications } from './shared/ui/AppToastNotifications'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <AppToastNotifications />
  </StrictMode>
)
