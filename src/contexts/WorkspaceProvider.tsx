import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { hasSupabaseConfig } from '../lib/env'
import { DemoKovaService } from '../services/demoService'
import { SupabaseKovaService } from '../services/supabaseService'
import type { WorkspaceData } from '../types/domain'
import { useAuth } from '../hooks/useAuth'
import { WorkspaceContext } from './WorkspaceContext'

export function WorkspaceProvider({ children }: PropsWithChildren) {
  const { user } = useAuth()
  const service = useMemo(() => hasSupabaseConfig ? new SupabaseKovaService() : new DemoKovaService(), [])
  const [data, setData] = useState<WorkspaceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setData(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setData(await service.loadWorkspace())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar KOVA.')
    } finally {
      setLoading(false)
    }
  }, [service, user])

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  const value = useMemo(() => ({
    data,
    loading,
    error,
    service,
    refresh,
    createWorkspace: async () => {
      await service.createWorkspace('KOVA', 'kova')
      await refresh()
    },
  }), [data, error, loading, refresh, service])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
