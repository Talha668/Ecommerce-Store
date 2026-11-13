import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authApi } from '../api/auth'
import { api, clearTokens, hasRefreshToken, setTokens } from '../api/client'
import type { AuthResponse, User } from '../api/types'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<AuthResponse>
  register: (payload: {
    email: string
    first_name: string
    last_name: string
    phone_number?: string
    password: string
    password2: string
  }) => Promise<AuthResponse>
  logout: () => Promise<void>
  /** Called after login/refresh to reload the user object. */
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(() => hasRefreshToken())

  // On mount: if we have a refresh token, restore the session by
  // fetching /api/auth/me/ (the client auto-refreshes the access token).
  useEffect(() => {
    if (!hasRefreshToken()) return

    let cancelled = false
    api
      .get<User>('/api/auth/me/')
      .then((u) => {
        if (!cancelled) setUser(u)
      })
      .catch(() => {
        clearTokens()
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password })
    setUser(res.user)
    return res
  }, [])

  const register = useCallback(
    async (payload: {
      email: string
      first_name: string
      last_name: string
      phone_number?: string
      password: string
      password2: string
    }) => {
      const res = await authApi.register(payload)
      setUser(res.user)
      return res
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    if (!hasRefreshToken()) return
    const u = await api.get<User>('/api/auth/me/')
    setUser(u)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, register, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Convenience guard for pages/components that only render for logged-in users. */
export function useRequireAuth(): User {
  const { user } = useAuth()
  if (!user) throw new Error('Auth required')
  return user
}

// Re-export so callers don't need to import from api/client directly.
export { setTokens }
