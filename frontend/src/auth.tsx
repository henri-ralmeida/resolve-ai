import { useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import { AuthContext, type AuthContextValue, type Session } from './auth-context'
import type { AuthResponse } from './types'

const sessionKey = 'resolveai.session'

function readSession(): Session | undefined {
  const raw = localStorage.getItem(sessionKey)
  if (!raw) return undefined
  try {
    return JSON.parse(raw) as Session
  } catch {
    localStorage.removeItem(sessionKey)
    return undefined
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | undefined>(readSession)

  async function authenticate(path: string, body: object) {
    const response = await api<AuthResponse>(path, { method: 'POST', body: JSON.stringify(body) })
    localStorage.setItem(sessionKey, JSON.stringify(response))
    setSession(response)
  }

  const value = useMemo<AuthContextValue>(() => ({
    session,
    login: (email, password) => authenticate('/api/auth/login', { email, password }),
    register: (name, email, password) => authenticate('/api/auth/register', { name, email, password }),
    logout: () => {
      localStorage.removeItem(sessionKey)
      setSession(undefined)
    },
  }), [session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
