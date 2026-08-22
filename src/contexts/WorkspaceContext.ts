import { createContext } from 'react'
import type { KovaService } from '../services/contracts'
import type { WorkspaceData } from '../types/domain'

export interface WorkspaceContextValue {
  data: WorkspaceData | null
  loading: boolean
  error: string | null
  service: KovaService
  refresh: () => Promise<void>
  createWorkspace: () => Promise<void>
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)
