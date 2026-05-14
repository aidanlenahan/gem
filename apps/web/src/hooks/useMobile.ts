import { useState, useEffect } from 'react'

/**
 * Detects whether the software keyboard is visible by comparing the visual
 * viewport height against the window inner height.  A gap >150px means the
 * keyboard is taking up space.  Falls back to `false` on browsers that don't
 * support visualViewport.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    // Store the full-screen height at mount. With interactive-widget=resizes-content,
    // window.innerHeight shrinks along with vv.height when the keyboard appears, so
    // comparing those two is always ~0. Comparing against the mount-time height reliably
    // detects any reduction caused by the software keyboard.
    const fullHeight = vv.height
    const handle = () => setVisible(fullHeight - vv.height > 150)
    vv.addEventListener('resize', handle)
    return () => vv.removeEventListener('resize', handle)
  }, [])

  return visible
}

interface LongPressHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onContextMenu: (e: React.MouseEvent) => void
}

/**
 * Returns a set of touch event handlers that fire `onLongPress` after the
 * finger has been held down for `ms` milliseconds without moving.  Scrolling
 * (onTouchMove) cancels the timer so lists remain scrollable.
 *
 * Not a React hook — safe to call inside .map() callbacks.
 */
export function createLongPressHandlers(
  onLongPress: () => void,
  ms = 500,
): LongPressHandlers {
  let timerId: ReturnType<typeof setTimeout> | null = null
  let moved = false

  return {
    onTouchStart: () => {
      moved = false
      timerId = setTimeout(() => { if (!moved) onLongPress() }, ms)
    },
    onTouchEnd: () => {
      if (timerId !== null) { clearTimeout(timerId); timerId = null }
    },
    onTouchMove: () => {
      moved = true
      if (timerId !== null) { clearTimeout(timerId); timerId = null }
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  }
}

interface SwipeRevealHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
}

/**
 * Returns touch handlers that detect a right-swipe on the element and call
 * `onReveal` when the finger travels > `threshold` px horizontally.  The
 * element slides with the finger via direct DOM style manipulation (no React
 * re-renders) and springs back on release.  Vertical scrolls are detected
 * early and ignored so normal list scrolling is unaffected.
 *
 * Not a React hook — safe to call inside .map() callbacks.
 */
export function createSwipeRevealHandlers(
  onReveal: () => void,
  threshold = 70,
): SwipeRevealHandlers {
  let startX = 0
  let startY = 0
  let maxDx = 0
  let intent: 'unknown' | 'swipe' | 'scroll' = 'unknown'
  let el: HTMLElement | null = null

  return {
    onTouchStart: (e: React.TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      maxDx = 0
      intent = 'unknown'
      el = e.currentTarget as HTMLElement
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (!el) return
      const dx = e.touches[0].clientX - startX
      const dy = Math.abs(e.touches[0].clientY - startY)

      if (intent === 'unknown') {
        if (dy > 8) { intent = 'scroll'; return }
        if (dx > 8) intent = 'swipe'
        else return
      }
      if (intent !== 'swipe') return

      if (dx > 0 && dx <= 100) {
        maxDx = Math.max(maxDx, dx)
        el.style.transform = `translateX(${dx}px)`
        el.style.transition = 'none'
      }
    },
    onTouchEnd: (_e: React.TouchEvent) => {
      if (!el) return
      el.style.transition = 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      el.style.transform = 'translateX(0)'
      if (intent === 'swipe' && maxDx >= threshold) onReveal()
      el = null
    },
  }
}
