import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SettingsProvider } from './contexts/SettingsContext'
import { FileProvider } from './contexts/FileContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <SettingsProvider>
      <FileProvider>
        <App />
      </FileProvider>
    </SettingsProvider>
  </React.StrictMode>
)
