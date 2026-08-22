import { LoaderCircle } from 'lucide-react'
import { cn } from '../../utils/cn'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

const variants: Record<Variant, string> = {
  primary: 'bg-stone-950 text-white hover:bg-stone-800 shadow-sm',
  secondary: 'border border-stone-200 bg-white text-stone-800 hover:bg-stone-50',
  ghost: 'text-stone-600 hover:bg-stone-100 hover:text-stone-950',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
}

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
  icon: 'size-10 p-0',
}

export function Button({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn('inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50', variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}
