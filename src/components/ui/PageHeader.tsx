import type { ReactNode } from 'react'

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-stone-400">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-stone-950 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-stone-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}
