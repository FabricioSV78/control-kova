import type { PropsWithChildren } from 'react'
import { cn } from '../../utils/cn'

export function Badge({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }>) {
  const tones = {
    neutral: 'bg-stone-100 text-stone-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
  }
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold', tones[tone])}>{children}</span>
}
