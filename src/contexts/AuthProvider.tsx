import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { hasSupabaseConfig } from '../lib/env'
import { DEMO_USER_ID } from '../services/demoData'
import { toFriendlyError } from '../services/errors'
import { AuthContext, type AuthUser } from './AuthContext'

const DEMO_SESSION_KEY = 'kova-control-demo-session'

function mapUser(user: User): AuthUser {
  const name = typeof user.user_metadata.full_name === 'string'
    ? user.user_metadata.full_name
    : user.email?.split('@')[0] ?? 'Usuario KOVA'
  return { id: user.id, email: user.email ?? '', name, isDemo: false }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const demoSessionActive = !hasSupabaseConfig && localStorage.getItem(DEMO_SESSION_KEY) === 'active'
  const [user, setUser] = useState<AuthUser | null>(() => demoSessionActive
    ? { id: DEMO_USER_ID, email: 'demo@kova.pe', name: 'Fabricio', isDemo: true }
    : null)
  const [initializing, setInitializing] = useState(hasSupabaseConfig)

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      return
    }

    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ? mapUser(data.session.user) : null)
      setInitializing(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? mapUser(session.user) : null)
      setInitializing(false)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const value = useMemo(() => ({
    user,
    initializing,
    login: async (email: string, password: string) => {
      if (!supabase) throw new Error('Supabase no está configurado. Usa el acceso demo.')
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw toFriendlyError(error, 'Correo o contraseña incorrectos.')
    },
    loginDemo: () => {
      localStorage.setItem(DEMO_SESSION_KEY, 'active')
      setUser({ id: DEMO_USER_ID, email: 'demo@kova.pe', name: 'Fabricio', isDemo: true })
    },
    logout: async () => {
      if (user?.isDemo) {
        localStorage.removeItem(DEMO_SESSION_KEY)
        setUser(null)
        return
      }
      if (supabase) await supabase.auth.signOut()
      setUser(null)
    },
  }), [initializing, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
