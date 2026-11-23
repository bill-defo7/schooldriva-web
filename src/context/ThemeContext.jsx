import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const ThemeProvider = ({ children }) => {
  const getThemeInitial = () => {
    const sauvegarde = localStorage.getItem('schooldriva-theme')
    if (sauvegarde) return sauvegarde === 'dark'
    const heure = new Date().getHours()
    return heure >= 20 || heure < 6
  }

  const [modeNuit, setModeNuit] = useState(getThemeInitial)

  useEffect(() => {
    localStorage.setItem('schooldriva-theme', modeNuit ? 'dark' : 'light')
  }, [modeNuit])

  const basculerTheme = () => setModeNuit(prev => !prev)

  return (
    <ThemeContext.Provider value={{ modeNuit, basculerTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)