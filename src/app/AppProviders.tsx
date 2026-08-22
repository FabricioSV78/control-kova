import type { PropsWithChildren } from 'react'
import { Toaster } from 'sonner'
import { AuthProvider } from '../contexts/AuthProvider'
import { WorkspaceProvider } from '../contexts/WorkspaceProvider'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </WorkspaceProvider>
    </AuthProvider>
  )
}
