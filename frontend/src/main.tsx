import * as React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App' // FIX: Removed .tsx extension
import './index.css'
import { HashRouter } from 'react-router-dom'

createRoot(document.getElementById('root')!).render( // FIX: Changed ReactDOM.createRoot to createRoot
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)