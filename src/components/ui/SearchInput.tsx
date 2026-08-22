import { Search, X } from 'lucide-react'

export function SearchInput({ value, onChange, placeholder = 'Buscar…' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="relative block w-full sm:max-w-sm">
      <span className="sr-only">Buscar</span>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-9 text-sm outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200" />
      {value && <button type="button" onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700" aria-label="Limpiar búsqueda"><X className="size-4" /></button>}
    </label>
  )
}
