
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'
import { ChauffeurProvider } from './context/ChauffeurContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ChauffeurProvider>
        <App />
      </ChauffeurProvider>
    </ThemeProvider>
  </StrictMode>,
)