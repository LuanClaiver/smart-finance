import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ToastHost from './components/ToastHost'
import ConfirmHost from './components/ConfirmHost'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <ToastHost />
    <ConfirmHost />
  </React.StrictMode>,
)
