import type { LucideIcon } from 'lucide-react'
import { Button } from './Button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: string
  onAction?: () => void
}

export function EmptyState({ icon: Icon, title, description, action, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-5 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-stone-100"><Icon className="size-5 text-stone-600" /></div>
      <h3 className="mt-4 font-display text-base font-bold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-stone-500">{description}</p>
      {action && onAction && <Button className="mt-5" onClick={onAction}>{action}</Button>}
    </div>
  )
}
