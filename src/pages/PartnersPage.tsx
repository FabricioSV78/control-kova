import { ArrowRightLeft, HandCoins, UsersRound } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { useWorkspace } from '../hooks/useWorkspace'
import { calculateMetrics, presetRange } from '../utils/analytics'
import { formatCurrency, formatDate } from '../utils/format'

export function PartnersPage() {
  const { data } = useWorkspace()
  if (!data) return null
  const metrics = calculateMetrics(data, presetRange('all'))
  const rows = data.expenses.flatMap((expense) => expense.contributions.map((contribution) => ({ ...contribution, concept: expense.concept, date: expense.spentAt, category: expense.category }))).sort((a, b) => b.date.localeCompare(a.date))
  return <div className="space-y-7"><PageHeader eyebrow="Capital aportado" title="Socios" description="Consulta cuánto ha financiado cada persona, sin interpretar deudas entre socios." />
    <section className="grid gap-4 md:grid-cols-3"><PartnerCard name="Fabricio" value={metrics.fabricio} initial="F" /><PartnerCard name="Daniela" value={metrics.daniela} initial="D" /><Card className="bg-stone-950 p-6 text-white"><span className="grid size-10 place-items-center rounded-xl bg-stone-800"><UsersRound className="size-5" /></span><p className="mt-6 text-xs font-bold uppercase tracking-wider text-stone-500">Total aportado</p><p className="mt-2 font-display text-3xl font-extrabold">{formatCurrency(metrics.totalContributions)}</p><div className="mt-4 flex items-center gap-2 text-xs text-stone-400"><ArrowRightLeft className="size-4" />Diferencia: {formatCurrency(metrics.contributionDifference)}</div></Card></section>
    <Card className="overflow-hidden"><div className="border-b border-stone-100 px-5 py-5 sm:px-6"><h2 className="font-display font-bold">Historial de aportes</h2><p className="mt-1 text-xs text-stone-400">Gastos del negocio financiados personalmente</p></div>{rows.length === 0 ? <EmptyState icon={HandCoins} title="Sin aportes todavía" description="Los gastos pagados por Fabricio o Daniela aparecerán aquí." /> : <div className="divide-y divide-stone-100">{rows.map((row) => <div key={row.id} className="flex items-center gap-4 px-5 py-4 sm:px-6"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-stone-100 text-sm font-extrabold">{row.partner.charAt(0)}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{row.concept}</p><p className="mt-0.5 text-xs text-stone-400">{row.partner} · {row.category} · {formatDate(row.date)}</p></div><p className="text-sm font-extrabold">{formatCurrency(row.amount)}</p></div>)}</div>}</Card>
  </div>
}
function PartnerCard({ name, value, initial }: { name: string; value: number; initial: string }) { return <Card className="p-6"><span className="grid size-10 place-items-center rounded-full bg-stone-950 font-display font-extrabold text-white">{initial}</span><p className="mt-6 text-xs font-bold uppercase tracking-wider text-stone-400">{name}</p><p className="mt-2 font-display text-3xl font-extrabold">{formatCurrency(value)}</p><p className="mt-2 text-xs text-stone-400">Total aportado al negocio</p></Card> }
