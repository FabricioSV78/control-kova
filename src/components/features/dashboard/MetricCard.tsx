import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react'
import { Card } from '../../ui/Card'
import { cn } from '../../../utils/cn'

export function MetricCard({ label, value, icon: Icon, tone = 'neutral', helper, numericValue }: { label: string; value: string; icon: LucideIcon; tone?: 'neutral' | 'positive' | 'negative'; helper?: string; numericValue?: number }) {
  const ToneIcon = numericValue === undefined || numericValue === 0 ? Minus : numericValue > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <Card className="relative overflow-hidden p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-stone-500">{label}</p><span className={cn('grid size-9 place-items-center rounded-xl', tone === 'negative' ? 'bg-red-50 text-red-600' : tone === 'positive' ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-600')}><Icon className="size-[18px]" /></span></div>
      <p className={cn('mt-5 font-display text-2xl font-extrabold tracking-tight sm:text-[28px]', tone === 'negative' && 'text-red-600', tone === 'positive' && 'text-emerald-700')}>{value}</p>
      {helper && <p className="mt-2 flex items-center gap-1 text-xs font-medium text-stone-400"><ToneIcon className="size-3.5" />{helper}</p>}
    </Card>
  )
}
