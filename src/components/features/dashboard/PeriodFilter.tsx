import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { cn } from '../../../utils/cn'
import { presetRange, type DateRange, type PeriodPreset } from '../../../utils/analytics'
import { Input } from '../../ui/FormField'

const periods: Array<{ value: PeriodPreset; label: string }> = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
  { value: 'previous-month', label: 'Mes anterior' },
  { value: 'year', label: 'Este año' },
  { value: 'all', label: 'Todo' },
  { value: 'custom', label: 'Personalizado' },
]

const dateInputValue = (date: Date | null) => date ? date.toISOString().slice(0, 10) : ''
const fromInput = (value: string, end = false) => value ? new Date(`${value}T${end ? '23:59:59.999' : '00:00:00'}`) : null

export function PeriodFilter({ value, range, onChange }: { value: PeriodPreset; range: DateRange; onChange: (preset: PeriodPreset, range: DateRange) => void }) {
  const [customOpen, setCustomOpen] = useState(value === 'custom')
  const selectPeriod = (period: PeriodPreset) => {
    setCustomOpen(period === 'custom')
    onChange(period, presetRange(period))
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {periods.map((period) => <button key={period.value} type="button" onClick={() => selectPeriod(period.value)} className={cn('h-9 shrink-0 rounded-xl border px-3.5 text-xs font-bold transition', value === period.value ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400')}>{period.value === 'custom' && <CalendarDays className="mr-1.5 inline size-3.5" />}{period.label}</button>)}
      </div>
      {customOpen && <div className="grid max-w-lg grid-cols-2 gap-3 rounded-2xl border border-stone-200 bg-white p-3"><Input label="Desde" type="date" value={dateInputValue(range.from)} onChange={(event) => onChange('custom', { ...range, from: fromInput(event.target.value) })} /><Input label="Hasta" type="date" value={dateInputValue(range.to)} onChange={(event) => onChange('custom', { ...range, to: fromInput(event.target.value, true) })} /></div>}
    </div>
  )
}
