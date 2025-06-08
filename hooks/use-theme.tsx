"use client"

import { useTheme as useNextTheme } from "next-themes"
import { useEffect, useState } from "react"

export function useTheme() {
  const { theme, setTheme, systemTheme } = useNextTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return {
      theme: undefined,
      setTheme,
      systemTheme: undefined,
      resolvedTheme: undefined,
    }
  }

  const resolvedTheme = theme === "system" ? systemTheme : theme

  return {
    theme,
    setTheme,
    systemTheme,
    resolvedTheme,
  }
}
