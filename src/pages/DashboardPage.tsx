import { ArrowRight, CircleDollarSign, HandCoins, PackagePlus, Plus, ReceiptText, ShoppingBag, TrendingDown, TrendingUp, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MetricCard } from '../components/features/dashboard/MetricCard'
import { PeriodFilter } from '../components/features/dashboard/PeriodFilter'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { useWorkspace } from '../hooks/useWorkspace'
import { buildDailySeries, buildExpenseDistribution, buildTopProducts, calculateMetrics, presetRange, type DateRange, type PeriodPreset } from '../utils/analytics'
import { formatCurrency, formatDate } from '../utils/format'
import type { WorkspaceData } from '../types/domain'

const pieColors = ['#171717', '#57534e', '#a8a29e', '#dc2626', '#2563eb', '#ca8a04', '#7c3aed']

export function DashboardPage() {
  const { data } = useWorkspace()
  if (!data) return null
  return <DashboardContent data={data} />
}

function DashboardContent({ data }: { data: WorkspaceData }) {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<PeriodPreset>('month')
  const [range, setRange] = useState<DateRange>(() => presetRange('month'))
  const metrics = useMemo(() => calculateMetrics(data, range), [data, range])
  const daily = useMemo(() => buildDailySeries(metrics.filteredSales, metrics.filteredExpenses, range), [metrics.filteredExpenses, metrics.filteredSales, range])
  const expensesByCategory = useMemo(() => buildExpenseDistribution(metrics.filteredExpenses), [metrics.filteredExpenses])
  const topProducts = useMemo(() => buildTopProducts(metrics.filteredSales), [metrics.filteredSales])
  const recent = data.activities.slice(0, 5)

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Resumen del negocio" title="Hola, KOVA" description="Tus números importantes, sin complicaciones." actions={<Button onClick={() => navigate('/ventas?new=1')}><Plus className="size-4" />Nueva venta</Button>} />
      <PeriodFilter value={period} range={range} onChange={(nextPeriod, nextRange) => { setPeriod(nextPeriod); setRange(nextRange) }} />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard label="Ingresos" value={formatCurrency(metrics.income)} icon={TrendingUp} tone="positive" />
        <MetricCard label="Egresos" value={formatCurrency(metrics.expenses)} icon={TrendingDown} />
        <MetricCard label="Ganancia neta" value={formatCurrency(metrics.profit)} icon={WalletCards} tone={metrics.profit < 0 ? 'negative' : 'positive'} helper={metrics.profit < 0 ? 'Resultado negativo' : 'Resultado del periodo'} numericValue={metrics.profit} />
        <MetricCard label="Ventas realizadas" value={String(metrics.salesCount)} icon={ShoppingBag} />
        <MetricCard label="Aporte Fabricio" value={formatCurrency(metrics.fabricio)} icon={HandCoins} />
        <MetricCard label="Aporte Daniela" value={formatCurrency(metrics.daniela)} icon={HandCoins} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="mb-6"><h2 className="font-display text-base font-bold">Ingresos vs egresos</h2><p className="mt-1 text-xs text-stone-400">Movimiento diario del periodo</p></div>
          <div className="h-72">
            {daily.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={daily} margin={{ left: -20, right: 4 }}><defs><linearGradient id="income" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#171717" stopOpacity={0.2}/><stop offset="95%" stopColor="#171717" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 11 }} /><Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ borderRadius: 12, borderColor: '#e7e5e4', fontSize: 12 }} /><Area type="monotone" dataKey="ingresos" stroke="#171717" strokeWidth={2} fill="url(#income)" /><Area type="monotone" dataKey="egresos" stroke="#dc2626" strokeWidth={2} fill="transparent" /></AreaChart></ResponsiveContainer> : <ChartEmpty />}
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <div><h2 className="font-display text-base font-bold">Distribución de gastos</h2><p className="mt-1 text-xs text-stone-400">Por categoría</p></div>
          <div className="h-48">
            {expensesByCategory.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={expensesByCategory} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={3}>{expensesByCategory.map((item, index) => <Cell key={item.name} fill={pieColors[index % pieColors.length]} />)}</Pie><Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ borderRadius: 12, borderColor: '#e7e5e4', fontSize: 12 }} /></PieChart></ResponsiveContainer> : <ChartEmpty />}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">{expensesByCategory.slice(0, 6).map((item, index) => <div key={item.name} className="flex items-center gap-2 text-xs text-stone-600"><span className="size-2 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }} /><span className="truncate">{item.name}</span></div>)}</div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="mb-5"><h2 className="font-display text-base font-bold">Productos más vendidos</h2><p className="mt-1 text-xs text-stone-400">Unidades por producto</p></div>
          <div className="h-60">{topProducts.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={topProducts} layout="vertical" margin={{ left: 8, right: 16 }}><CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" horizontal={false} /><XAxis type="number" axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: '#a8a29e', fontSize: 11 }} /><YAxis type="category" dataKey="name" width={90} axisLine={false} tickLine={false} tick={{ fill: '#57534e', fontSize: 11 }} /><Tooltip /><Bar dataKey="unidades" fill="#171717" radius={[0, 6, 6, 0]} barSize={18} /></BarChart></ResponsiveContainer> : <ChartEmpty />}</div>
        </Card>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-5 sm:px-6"><div><h2 className="font-display text-base font-bold">Actividad reciente</h2><p className="mt-1 text-xs text-stone-400">Últimos movimientos</p></div><Link to="/historial" className="flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-stone-950">Ver todo <ArrowRight className="size-3.5" /></Link></div>
          <div className="divide-y divide-stone-100">{recent.map((activity) => <div key={activity.id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6"><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${activity.type === 'sale' ? 'bg-emerald-50 text-emerald-700' : activity.type === 'expense' ? 'bg-red-50 text-red-700' : 'bg-stone-100 text-stone-600'}`}>{activity.type === 'sale' ? <CircleDollarSign className="size-4" /> : activity.type === 'expense' ? <ReceiptText className="size-4" /> : <PackagePlus className="size-4" />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{activity.title}</p><p className="truncate text-xs text-stone-400">{activity.description} · {formatDate(activity.occurredAt)}</p></div>{activity.amount !== null && <p className="text-sm font-bold tabular-nums">{formatCurrency(activity.amount)}</p>}</div>)}</div>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-display text-sm font-bold">Acciones rápidas</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[{ label: 'Venta', icon: CircleDollarSign, to: '/ventas?new=1' }, { label: 'Gasto', icon: ReceiptText, to: '/gastos?new=1' }, { label: 'Producto', icon: PackagePlus, to: '/productos?new=1' }, { label: 'Ver reportes', icon: TrendingUp, to: '/reportes' }].map(({ label, icon: Icon, to }) => <button key={label} type="button" onClick={() => navigate(to)} className="group flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-stone-400 hover:shadow-md"><span className="grid size-10 place-items-center rounded-xl bg-stone-100 transition group-hover:bg-stone-950 group-hover:text-white"><Icon className="size-[18px]" /></span><span className="text-sm font-bold">{label}</span></button>)}
        </div>
      </section>
    </div>
  )
}

function ChartEmpty() {
  return <div className="grid h-full place-items-center text-center"><div><CircleDollarSign className="mx-auto size-6 text-stone-300" /><p className="mt-2 text-xs font-semibold text-stone-400">Sin datos en este periodo</p></div></div>
}
