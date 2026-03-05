import { createContext, useCallback, useContext, useState } from 'react'

interface AuthContextValue {
  token: string | null
  setToken: (token: string | null) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'synapse_token'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  )

  const setToken = useCallback((newToken: string | null) => {
    if (newToken) {
      localStorage.setItem(STORAGE_KEY, newToken)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    setTokenState(newToken)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
  }, [setToken])

  const value: AuthContextValue = {
    token,
    setToken,
    logout,
    isAuthenticated: !!token,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
