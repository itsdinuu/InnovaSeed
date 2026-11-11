"use client"

import { createContext, useContext, useState } from 'react'

type ThemeContextType = {
  isDarkMode: boolean
  toggleDarkMode: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleDarkMode: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('innova_theme') === 'dark'
  })

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const nextMode = !prev

      if (typeof window !== 'undefined') {
        localStorage.setItem('innova_theme', nextMode ? 'dark' : 'light')
      }

      return nextMode
    })
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}