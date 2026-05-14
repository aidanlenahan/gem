import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePwaInstall() {
  const isPwa =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true)

  const isIOS =
    typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid =
    typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent)
  const isMobile = isIOS || isAndroid

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem('pwaInstallDismissed') === '1',
  )

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    localStorage.setItem('pwaInstallDismissed', '1')
    setDismissed(true)
  }

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      dismiss()
    }
    return outcome === 'accepted'
  }

  // Show when: mobile browser, not already installed as PWA, not dismissed
  const showBanner = !isPwa && isMobile && !dismissed

  return { isPwa, isIOS, isAndroid, isMobile, showBanner, deferredPrompt, install, dismiss }
}
