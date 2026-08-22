import { createContext } from 'react'

export interface AuthUser {
  id: string
  email: string
  name: string
  isDemo: boolean
}

export interface AuthContextValue {
  user: AuthUser | null
  initializing: boolean
  login: (email: string, password: string) => Promise<void>
  loginDemo: () => void
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
