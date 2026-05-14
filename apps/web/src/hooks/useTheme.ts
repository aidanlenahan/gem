import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'

function applyTheme(theme: string | null | undefined) {
  const [rawMode, accent] = (theme ?? 'dark').split(':')
  document.documentElement.setAttribute('data-theme', rawMode === 'light' ? 'light' : 'dark')
  if (accent && accent !== 'indigo') {
    document.documentElement.setAttribute('data-accent', accent)
  } else {
    document.documentElement.removeAttribute('data-accent')
  }
}

/** Reads theme from auth store and applies data-theme + data-accent to <html>. */
export function useThemeApplier() {
  const theme = useAuthStore((s) => s.user?.theme)
  useEffect(() => { applyTheme(theme) }, [theme])
}

/** Initialises theme before React mounts (avoids flash on cold load). */
export function initTheme() {
  try {
    const stored = localStorage.getItem('fg-auth')
    if (stored) {
      const parsed = JSON.parse(stored) as { state?: { user?: { theme?: string } } }
      applyTheme(parsed?.state?.user?.theme)
      return
    }
  } catch {
    // ignore parse errors
  }
  document.documentElement.setAttribute('data-theme', 'dark')
}
