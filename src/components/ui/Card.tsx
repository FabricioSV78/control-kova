import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]', className)} {...props} />
}
