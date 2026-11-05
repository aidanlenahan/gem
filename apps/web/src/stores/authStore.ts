import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { apiFetch } from '../lib/api'
import { queryClient } from '../lib/queryClient'

interface User {
  id: string
  email: string
  name: string
  username?: string | null
  bio?: string | null
  avatarUrl?: string | null
  theme?: string | null
  showEmail?: boolean
  onboardingDone?: boolean
  birthdate?: string | null
  birthdateSet?: boolean
  isAdmin?: boolean
  isDemo?: boolean
}

interface AuthState {
  user: User | null
  hydrated: boolean
  login: (user: User) => void
  logout: () => void
  markHydrated: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      hydrated: false,
      login: (user) => {
        // Clear stale cache when:
        //  (a) switching between two logged-in users (e.g. demo → real account)
        //  (b) logging back in after an explicit logout — hydrated=true means we're
        //      past Zustand's initial rehydration callback, so queryClient.clear() is safe.
        //      Skipped during initial hydration (hydrated=false, null→user from
        //      onRehydrateStorage) because the cache is empty and calling clear() inside
        //      that callback triggers React 19 observer errors.
        const current = get().user
        if (current && current.id !== user.id) {
          queryClient.clear()
        } else if (!current && get().hydrated) {
          // Login after logout: inflight requests from the previous session may have
          // re-populated the cache after queryClient.clear() was called in logout().
          queryClient.clear()
        }
        set({ user })
      },
      logout: () => {
        // Fire-and-forget: clear the HttpOnly cookie server-side.
        apiFetch('/auth/logout', { method: 'POST' }).catch(() => {/* ignore */})
        // Best-effort abort inflight requests so they don't re-populate the cache
        // after it is cleared below.
        void queryClient.cancelQueries()
        queryClient.clear()
        set({ user: null })
      },
      markHydrated: () => {
        set({ hydrated: true })
      },
      setUser: (user) => {
        set({ user })
      },
    }),
    {
      name: 'fg-auth',
      storage: createJSONStorage(() => localStorage),
      // Only persist the user object — never the token (cookie handles auth).
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          // Fast path: user found in localStorage, ready immediately.
          state.markHydrated()
        } else {
          // No user in localStorage but a session cookie may still be valid
          // (e.g. localStorage cleared, hard redirect from another origin).
          // Check before deciding whether to show login.
          apiFetch<{ user: User }>('/users/me')
            .then((data) => { if (data.user) state?.login(data.user) })
            .catch(() => {})
            .finally(() => state?.markHydrated())
        }
      },
    },
  ),
)
