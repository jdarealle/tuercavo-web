import { createContext, useContext } from 'react'

export type Theme = 'light' | 'dark' | 'system'

export const ThemeContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
} | null>(null)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('ThemeProvider is missing')
  return context
}
