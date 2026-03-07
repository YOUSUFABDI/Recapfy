"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react"
import { ThemeProvider, CssBaseline, useMediaQuery } from "@mui/material"
import type { PaletteMode } from "@mui/material"
import { getTheme } from "@/theme"

type ModeSetting = "light" | "dark" | "system"

type ThemeModeContextValue = {
  setting: ModeSetting // user's choice (light/dark/system)
  mode: PaletteMode // effective mode (light/dark)
  setSetting: (next: ModeSetting) => void
  toggle: () => void // toggles light<->dark (exits "system")
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null)
const STORAGE_KEY = "ui:color-scheme"

// Initialize setting synchronously from localStorage (client-side only)
// Reads from localStorage, which should match what the script in layout.tsx set
function getInitialSetting(): ModeSetting {
  if (typeof window === "undefined") return "system"
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as ModeSetting | null
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved
    }
  } catch (e) {
    // Ignore localStorage errors during initialization
  }
  return "system"
}

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage synchronously to prevent flash
  const [setting, setSetting] = useState<ModeSetting>(getInitialSetting)
  const [mounted, setMounted] = useState(false)

  // Media query for system preference (disable SSR to prevent hydration mismatch)
  // Default to false (light) to match server render
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)", {
    noSsr: true,
    defaultMatches: false, // Match server default (light)
  })

  // Mark as mounted immediately using useLayoutEffect (runs before paint)
  // This ensures we can read the DOM attribute and compute the correct mode
  // before the first paint, preventing flash
  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  // Compute effective mode from setting + system preference
  // Always start with "light" on first render to match server (prevents hydration mismatch)
  // After mount, compute from setting and preferences
  const mode: PaletteMode = useMemo(() => {
    if (!mounted) {
      // On initial render, always use "light" to match server default
      // This prevents hydration mismatch
      return "light"
    }
    // After mount, compute from setting and preferences
    if (setting === "system") {
      return prefersDark ? "dark" : "light"
    }
    return setting
  }, [setting, prefersDark, mounted])

  // Update DOM attributes synchronously before paint to prevent flash
  // useLayoutEffect runs synchronously after DOM mutations but before paint
  useLayoutEffect(() => {
    if (typeof window === "undefined") return

    // Sync <html> attributes for non-MUI styles/native controls
    // This runs synchronously before browser paint, preventing theme flash
    const html = document.documentElement
    html.setAttribute("data-theme", mode)
    html.style.colorScheme = mode

    // Also ensure className is set for compatibility
    html.classList.remove("light", "dark")
    html.classList.add(mode)
  }, [mode])

  // Listen for storage events (multi-tab sync) and ensure theme is applied
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const newSetting = e.newValue as ModeSetting
        if (
          newSetting === "light" ||
          newSetting === "dark" ||
          newSetting === "system"
        ) {
          setSetting(newSetting)
        }
      }
    }

    // Listen for focus to sync on tab switch/navigation
    const handleFocus = () => {
      const savedSetting = getInitialSetting()
      if (savedSetting !== setting) {
        setSetting(savedSetting)
      }
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("focus", handleFocus)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [setting])

  // Update localStorage when setting changes (async is fine for storage)
  useEffect(() => {
    if (typeof window === "undefined") return

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, setting)
    } catch (e) {
      // Handle localStorage errors gracefully
      console.warn("Failed to save theme preference to localStorage", e)
    }
  }, [setting])

  const value = useMemo<ThemeModeContextValue>(
    () => ({
      setting,
      mode,
      setSetting: (next: ModeSetting) => {
        setSetting(next)
      },
      toggle: () => {
        if (setting === "system") {
          // Exit system to the *opposite* of current effective mode.
          setSetting(mode === "dark" ? "light" : "dark")
        } else {
          setSetting(setting === "light" ? "dark" : "light")
        }
      },
    }),
    [setting, mode]
  )

  // Always use the computed theme from the actual mode
  // This ensures theme updates immediately when mode changes during navigation
  const theme = useMemo(() => getTheme(mode), [mode])

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext)
  if (!ctx)
    throw new Error("useThemeMode must be used within ThemeModeProvider")
  return ctx
}
