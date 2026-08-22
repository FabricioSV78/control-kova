import { useContext } from 'react'
import { WorkspaceContext } from '../contexts/WorkspaceContext'

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('useWorkspace debe usarse dentro de WorkspaceProvider.')
  return context
}
