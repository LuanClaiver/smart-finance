import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ToastHost from './components/ToastHost'
import ConfirmHost from './components/ConfirmHost'
import './styles.css'
import { installNotificationNavigation } from './services/mobile/notifications'
import { ensureDailyBackup } from './services/mobile/backup'

void installNotificationNavigation()
void ensureDailyBackup().catch(() => undefined)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <ToastHost />
    <ConfirmHost />
  </React.StrictMode>,
)
