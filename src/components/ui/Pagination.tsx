import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

export function Pagination({ page, pageCount, total, onChange }: { page: number; pageCount: number; total: number; onChange: (page: number) => void }) {
  if (pageCount <= 1) return <p className="px-1 py-3 text-xs text-stone-400">{total} registro{total === 1 ? '' : 's'}</p>
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <p className="text-xs text-stone-400">Página {page} de {pageCount} · {total} registros</p>
      <div className="flex gap-2"><Button variant="secondary" size="icon" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Página anterior"><ChevronLeft className="size-4" /></Button><Button variant="secondary" size="icon" disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="Página siguiente"><ChevronRight className="size-4" /></Button></div>
    </div>
  )
}
