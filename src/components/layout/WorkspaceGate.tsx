import { AlertTriangle, RefreshCw, Store } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { toast } from 'sonner'
import { useWorkspace } from '../../hooks/useWorkspace'
import { Button } from '../ui/Button'
import { LoadingState } from '../ui/LoadingState'

export function WorkspaceGate() {
  const { data, loading, error, refresh, createWorkspace } = useWorkspace()
  if (loading && !data) return <div className="mx-auto max-w-6xl p-6 sm:p-10"><LoadingState /></div>
  if (error) return (
    <div className="grid min-h-screen place-items-center bg-stone-100 p-6">
      <div className="max-w-md text-center"><AlertTriangle className="mx-auto size-9 text-red-600" /><h1 className="mt-4 font-display text-xl font-bold">No pudimos cargar KOVA</h1><p className="mt-2 text-sm text-stone-500">{error}</p><Button className="mt-5" onClick={() => void refresh()}><RefreshCw className="size-4" />Reintentar</Button></div>
    </div>
  )
  if (!data) return (
    <div className="grid min-h-screen place-items-center bg-stone-100 p-6">
      <div className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-stone-950 text-white"><Store className="size-6" /></div>
        <h1 className="mt-5 font-display text-2xl font-extrabold">Crear workspace KOVA</h1>
        <p className="mt-2 text-sm leading-6 text-stone-500">Tu usuario está autorizado, pero todavía no pertenece a un negocio. Este paso crea KOVA junto con sus categorías y medios de pago iniciales.</p>
        <Button className="mt-6 w-full" loading={loading} onClick={() => void createWorkspace().then(() => toast.success('Workspace KOVA creado.')).catch((reason: unknown) => toast.error(reason instanceof Error ? reason.message : 'No se pudo crear KOVA.'))}>Crear KOVA</Button>
      </div>
    </div>
  )
  return <Outlet />
}
