import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function ProtectedRoute() {
  const { user, initializing } = useAuth()
  const location = useLocation()
  if (initializing) return <div className="grid min-h-screen place-items-center bg-stone-950 text-sm font-semibold text-stone-400">Preparando KOVA…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
