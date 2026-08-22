import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useWorkspace } from '../../hooks/useWorkspace'
import { Button } from '../ui/Button'
import { Sidebar } from './Sidebar'

export function AppShell() {
  const [mobileMenu, setMobileMenu] = useState(false)
  const { data } = useWorkspace()
  return (
    <div className="min-h-screen bg-kova-50">
      <Sidebar mobileOpen={mobileMenu} onClose={() => setMobileMenu(false)} />
      <div className="lg:pl-[274px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-stone-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileMenu(true)} aria-label="Abrir menú"><Menu className="size-5" /></Button>
          <div className="text-center">
            <p className="font-display text-sm font-extrabold tracking-tight">{data?.business.name ?? 'KOVA'}</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400">Control</p>
          </div>
          <span className="size-10" />
        </header>
        <main className="mx-auto w-full max-w-[1540px] px-4 py-6 sm:px-6 sm:py-8 xl:px-10 xl:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
