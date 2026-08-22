import { LogOut, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../utils/cn'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { navigation } from './navigation'

interface SidebarProps {
  mobileOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  return (
    <>
      {mobileOpen && <button type="button" className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} aria-label="Cerrar menú" />}
      <aside className={cn('fixed inset-y-0 left-0 z-50 flex w-[274px] flex-col border-r border-stone-800 bg-stone-950 text-white transition-transform duration-200 lg:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-20 items-center justify-between border-b border-stone-800 px-6">
          <NavLink to="/" className="flex items-center gap-3" onClick={onClose}>
            <span className="grid size-10 place-items-center rounded-xl bg-white font-display text-lg font-black text-stone-950">K</span>
            <span>
              <span className="block font-display text-lg font-extrabold leading-none tracking-tight">KOVA</span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.24em] text-stone-500">Control</span>
            </span>
          </NavLink>
          <Button variant="ghost" size="icon" className="text-stone-400 hover:bg-stone-800 hover:text-white lg:hidden" onClick={onClose}><X className="size-5" /></Button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={onClose}
              className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition', isActive ? 'bg-white text-stone-950' : 'text-stone-400 hover:bg-stone-900 hover:text-white')}
            >
              <Icon className="size-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-stone-800 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-stone-900 p-3">
            <span className="grid size-9 place-items-center rounded-full bg-stone-700 text-sm font-bold">{user?.name.charAt(0).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><p className="truncate text-sm font-bold">{user?.name}</p>{user?.isDemo && <Badge>Demo</Badge>}</div>
              <p className="truncate text-xs text-stone-500">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-stone-400 hover:bg-stone-900 hover:text-white" onClick={() => void logout()}>
            <LogOut className="size-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>
    </>
  )
}
