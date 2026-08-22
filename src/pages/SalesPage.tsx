import { Eye, MoreHorizontal, Pencil, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { SaleDetailModal } from '../components/features/sales/SaleDetailModal'
import { SaleFormModal } from '../components/features/sales/SaleFormModal'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { Pagination } from '../components/ui/Pagination'
import { SearchInput } from '../components/ui/SearchInput'
import { useWorkspace } from '../hooks/useWorkspace'
import type { Sale } from '../types/domain'
import { formatCurrency, formatDate } from '../utils/format'

const PAGE_SIZE = 8

export function SalesPage() {
  const { data, service, refresh } = useWorkspace()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [formOpen, setFormOpen] = useState(params.get('new') === '1')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest' | 'highest'>('newest')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Sale | undefined>()
  const [viewing, setViewing] = useState<Sale | undefined>()
  const [deleting, setDeleting] = useState<Sale | undefined>()
  const [deleteLoading, setDeleteLoading] = useState(false)
  const sales = useMemo(() => {
    const query = search.trim().toLowerCase()
    return [...(data?.sales ?? [])].filter((sale) => !query || sale.customerName?.toLowerCase().includes(query) || sale.paymentMethod.toLowerCase().includes(query) || sale.items.some((item) => item.productName.toLowerCase().includes(query)) || String(sale.saleNumber).includes(query)).sort((a, b) => sort === 'highest' ? b.total - a.total : sort === 'oldest' ? a.soldAt.localeCompare(b.soldAt) : b.soldAt.localeCompare(a.soldAt))
  }, [data?.sales, search, sort])
  const pageCount = Math.max(1, Math.ceil(sales.length / PAGE_SIZE))
  const visible = sales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const closeForm = () => { setFormOpen(false); setEditing(undefined); if (params.get('new')) navigate('/ventas', { replace: true }) }
  const removeSale = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    try { await service.voidSale(deleting.id); await refresh(); toast.success('Venta eliminada.'); setDeleting(undefined) }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : 'No se pudo eliminar la venta.') }
    finally { setDeleteLoading(false) }
  }

  return <div className="space-y-7">
    <PageHeader eyebrow="Ingresos" title="Ventas" description="Registra cada pedido con el modelo y la medida de muñeca del cliente." actions={<Button onClick={() => setFormOpen(true)}><Plus className="size-4" />Nueva venta</Button>} />
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Buscar producto, cliente o venta…" /><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold outline-none"><option value="newest">Más recientes</option><option value="oldest">Más antiguas</option><option value="highest">Mayor importe</option></select></div>
    <Card className="overflow-hidden">
      {sales.length === 0 ? <EmptyState icon={ShoppingBag} title="Todavía no tienes ventas registradas" description={search ? 'No encontramos ventas con esa búsqueda.' : 'Registra tu primera venta y el dashboard se actualizará automáticamente.'} action={!search ? 'Registrar primera venta' : undefined} onAction={!search ? () => setFormOpen(true) : undefined} /> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full text-left"><thead className="border-b border-stone-100 bg-stone-50/70 text-[11px] font-bold uppercase tracking-wider text-stone-400"><tr><th className="px-5 py-3.5">Venta</th><th className="px-5 py-3.5">Fecha</th><th className="px-5 py-3.5">Pulseras</th><th className="px-5 py-3.5">Pago</th><th className="px-5 py-3.5 text-right">Total</th><th className="w-36 px-5 py-3.5 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-stone-100">{visible.map((sale) => <tr key={sale.id} className="hover:bg-stone-50/70"><td className="px-5 py-4 text-sm font-extrabold">#{String(sale.saleNumber).padStart(4, '0')}</td><td className="whitespace-nowrap px-5 py-4 text-sm text-stone-500">{formatDate(sale.soldAt)}</td><td className="max-w-xs px-5 py-4"><p className="truncate text-sm font-semibold">{sale.items.map(formatSaleItem).join(', ')}</p>{sale.customerName && <p className="mt-0.5 text-xs text-stone-400">{sale.customerName}</p>}</td><td className="px-5 py-4 text-sm text-stone-500">{sale.paymentMethod}</td><td className="px-5 py-4 text-right text-sm font-extrabold tabular-nums">{formatCurrency(sale.total)}</td><td className="px-5 py-4"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => setViewing(sale)} aria-label="Ver detalle"><Eye className="size-4" /></Button><Button variant="ghost" size="icon" onClick={() => setEditing(sale)} aria-label="Editar"><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" className="hover:text-red-600" onClick={() => setDeleting(sale)} aria-label="Eliminar"><Trash2 className="size-4" /></Button></div></td></tr>)}</tbody></table></div>
        <div className="divide-y divide-stone-100 md:hidden">{visible.map((sale) => <article key={sale.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-stone-400">#{String(sale.saleNumber).padStart(4, '0')} · {formatDate(sale.soldAt)}</p><p className="mt-1.5 font-bold">{sale.items.map(formatSaleItem).join(', ')}</p><p className="mt-1 text-xs text-stone-400">{sale.paymentMethod}{sale.customerName ? ` · ${sale.customerName}` : ''}</p></div><p className="shrink-0 font-display font-extrabold">{formatCurrency(sale.total)}</p></div><div className="mt-3 flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => setViewing(sale)}><Eye className="size-4" />Ver</Button><Button variant="ghost" size="icon" onClick={() => setEditing(sale)}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleting(sale)}><MoreHorizontal className="size-4" /></Button></div></article>)}</div>
      </>}
    </Card>
    <Pagination page={page} pageCount={pageCount} total={sales.length} onChange={setPage} />
    {(formOpen || editing) && <SaleFormModal sale={editing} onClose={closeForm} />}
    {viewing && <SaleDetailModal sale={viewing} onClose={() => setViewing(undefined)} />}
    <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(undefined)} onConfirm={removeSale} loading={deleteLoading} title="¿Seguro que deseas eliminar esta venta?" description="La venta dejará de contabilizarse en ingresos, reportes e historial." />
  </div>
}

function formatSaleItem(item: Sale['items'][number]): string {
  const measurement = item.wristMeasurementCm === null ? 'sin medida' : `${item.wristMeasurementCm} cm`
  return `${item.productName} × ${item.quantity} · ${measurement}`
}
