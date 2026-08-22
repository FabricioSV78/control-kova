import { CircleDollarSign, ClipboardList, PackageSearch, ReceiptText, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/FormField'
import { PageHeader } from '../components/ui/PageHeader'
import { Pagination } from '../components/ui/Pagination'
import { SearchInput } from '../components/ui/SearchInput'
import { useWorkspace } from '../hooks/useWorkspace'
import type { ActivityEntry } from '../types/domain'
import { formatCurrency, formatDate } from '../utils/format'

const PAGE_SIZE = 12

export function HistoryPage() {
  const { data } = useWorkspace()
  const [search, setSearch] = useState(''); const [type, setType] = useState('Todos'); const [partner, setPartner] = useState('Todos'); const [product, setProduct] = useState('Todos'); const [category, setCategory] = useState('Todas'); const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [page, setPage] = useState(1)
  const activities = useMemo(() => {
    const query = search.toLowerCase().trim()
    return (data?.activities ?? []).filter((activity) => {
      const expense = data?.expenses.find((item) => item.id === activity.entityId)
      const sale = data?.sales.find((item) => item.id === activity.entityId)
      const matchesText = !query || `${activity.title} ${activity.description} ${activity.actorName}`.toLowerCase().includes(query)
      const matchesType = type === 'Todos' || activity.type === type
      const matchesPartner = partner === 'Todos' || expense?.paidBy === partner || expense?.contributions.some((item) => item.partner === partner)
      const matchesProduct = product === 'Todos' || sale?.items.some((item) => item.productId === product) || (activity.type === 'product' && activity.entityId === product)
      const matchesCategory = category === 'Todas' || expense?.category === category
      const date = activity.occurredAt.slice(0, 10)
      return matchesText && matchesType && matchesPartner && matchesProduct && matchesCategory && (!from || date >= from) && (!to || date <= to)
    }).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  }, [category, data, from, partner, product, search, to, type])
  const pageCount = Math.max(1, Math.ceil(activities.length / PAGE_SIZE)); const visible = activities.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const groups = visible.reduce<Record<string, ActivityEntry[]>>((accumulator, activity) => { const key = formatDate(activity.occurredAt); (accumulator[key] ??= []).push(activity); return accumulator }, {})
  const reset = () => { setSearch(''); setType('Todos'); setPartner('Todos'); setProduct('Todos'); setCategory('Todas'); setFrom(''); setTo(''); setPage(1) }
  return <div className="space-y-7"><PageHeader eyebrow="Auditoría" title="Historial" description="Todo lo que ocurrió en KOVA, con fecha y persona responsable." actions={<Button variant="secondary" onClick={reset}><RotateCcw className="size-4" />Limpiar filtros</Button>} />
    <Card className="p-4"><div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(4,minmax(130px,0.7fr))]"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Buscar en el historial…" /><Filter value={type} onChange={setType}><option>Todos</option><option value="sale">Ventas</option><option value="expense">Gastos</option><option value="product">Productos</option></Filter><Filter value={partner} onChange={setPartner}><option>Todos</option><option>Fabricio</option><option>Daniela</option><option>Negocio</option><option>Compartido</option></Filter><Filter value={product} onChange={setProduct}><option>Todos</option>{data?.products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Filter><Filter value={category} onChange={setCategory}><option>Todas</option>{data?.categories.map((item) => <option key={item.id}>{item.name}</option>)}</Filter></div><div className="mt-3 grid gap-3 sm:max-w-md sm:grid-cols-2"><Input label="Desde" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /><Input label="Hasta" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></div></Card>
    <Card className="overflow-hidden">{activities.length === 0 ? <EmptyState icon={ClipboardList} title="No hay movimientos con estos filtros" description="Ajusta los filtros para volver a ver la actividad." /> : <div>{Object.entries(groups).map(([date, entries]) => <section key={date}><div className="border-b border-stone-100 bg-stone-50/70 px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-stone-500 sm:px-6">{date}</div><div className="divide-y divide-stone-100">{entries.map((activity) => <HistoryRow key={activity.id} activity={activity} />)}</div></section>)}</div>}</Card><Pagination page={page} pageCount={pageCount} total={activities.length} onChange={setPage} />
  </div>
}

function Filter({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) { return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 min-w-0 rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold outline-none">{children}</select> }
function HistoryRow({ activity }: { activity: ActivityEntry }) { const Icon = activity.type === 'sale' ? CircleDollarSign : activity.type === 'expense' ? ReceiptText : PackageSearch; const tone = activity.type === 'sale' ? 'bg-emerald-50 text-emerald-700' : activity.type === 'expense' ? 'bg-red-50 text-red-700' : 'bg-stone-100 text-stone-600'; return <article className="flex items-start gap-3 px-5 py-4 sm:px-6"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon className="size-[18px]" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-extrabold">{activity.title}</p><span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase text-stone-500">{activity.action === 'created' ? 'Creado' : activity.action === 'updated' ? 'Editado' : activity.action === 'deleted' ? 'Anulado' : 'Desactivado'}</span></div><p className="mt-1 text-sm text-stone-500">{activity.description}</p><p className="mt-1 text-xs text-stone-400">Por {activity.actorName}</p></div>{activity.amount !== null && <p className={`shrink-0 text-sm font-extrabold ${activity.type === 'sale' ? 'text-emerald-700' : activity.type === 'expense' ? 'text-red-600' : ''}`}>{activity.type === 'expense' ? '−' : '+'}{formatCurrency(activity.amount)}</p>}</article> }
