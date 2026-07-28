import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SettingsProvider } from './contexts/SettingsContext'
import { FileProvider } from './contexts/FileContext'
import { FormatProvider } from './contexts/FormatContext'
import 'mathlive/fonts.css'
import 'mathlive/static.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <SettingsProvider>
      <FileProvider>
        <FormatProvider>
          <App />
        </FormatProvider>
      </FileProvider>
    </SettingsProvider>
  </React.StrictMode>
)
