import { createContext, useContext, useEffect, useState } from "react"

// Chrome extension types
declare global {
  interface Window {
    chrome?: {
      storage: {
        sync: {
          get(keys: string | string[] | object | null, callback: (items: { [key: string]: any }) => void): void;
          set(items: object, callback?: () => void): void;
        }
      }
    }
  }
}

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

// Helper function to check if running in Chrome extension environment
const isChromeExtension = () => {
  return typeof window !== 'undefined' && window.chrome !== undefined && window.chrome.storage !== undefined
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  
  // Load theme from storage on initial render
  useEffect(() => {
    if (isChromeExtension()) {
      // Chrome extension environment - use chrome.storage
      window.chrome?.storage.sync.get(storageKey, (result) => {
        const savedTheme = result[storageKey] as Theme
        if (savedTheme) {
          setTheme(savedTheme)
        }
      })
    } else {
      // Fallback to localStorage for development environment
      const savedTheme = localStorage.getItem(storageKey) as Theme
      if (savedTheme) {
        setTheme(savedTheme)
      }
    }
  }, [storageKey])

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      if (isChromeExtension()) {
        // Chrome extension environment - use chrome.storage
        window.chrome?.storage.sync.set({ [storageKey]: newTheme }, () => {
          setTheme(newTheme)
        })
      } else {
        // Fallback to localStorage for development environment
        localStorage.setItem(storageKey, newTheme)
        setTheme(newTheme)
      }
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
