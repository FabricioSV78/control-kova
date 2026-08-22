import { Archive, Pencil, Plus, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ProductFormModal } from '../components/features/products/ProductFormModal'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { SearchInput } from '../components/ui/SearchInput'
import { useWorkspace } from '../hooks/useWorkspace'
import type { Product } from '../types/domain'
import { formatCurrency } from '../utils/format'

export function ProductsPage() {
  const { data, service, refresh } = useWorkspace(); const [params] = useSearchParams(); const navigate = useNavigate()
  const [open, setOpen] = useState(params.get('new') === '1'); const [editing, setEditing] = useState<Product>(); const [deactivating, setDeactivating] = useState<Product>(); const [busy, setBusy] = useState(false); const [search, setSearch] = useState(''); const [status, setStatus] = useState('active')
  const products = useMemo(() => { const query = search.toLowerCase(); return (data?.products ?? []).filter((product) => (!query || product.name.toLowerCase().includes(query) || product.sku?.toLowerCase().includes(query) || product.category.toLowerCase().includes(query)) && (status === 'all' || product.status === status)) }, [data?.products, search, status])
  const close = () => { setOpen(false); setEditing(undefined); if (params.get('new')) navigate('/productos', { replace: true }) }
  const deactivate = async () => { if (!deactivating) return; setBusy(true); try { await service.deactivateProduct(deactivating.id); await refresh(); toast.success('Producto desactivado.'); setDeactivating(undefined) } catch (reason) { toast.error(reason instanceof Error ? reason.message : 'No se pudo desactivar.') } finally { setBusy(false) } }
  return <div className="space-y-7"><PageHeader eyebrow="Catálogo" title="Productos" description="Modelos, precios y costos de las pulseras elaboradas a pedido." actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" />Nuevo producto</Button>} /><div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><SearchInput value={search} onChange={setSearch} placeholder="Buscar nombre, SKU o categoría…" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold"><option value="active">Activos</option><option value="inactive">Inactivos</option><option value="all">Todos</option></select></div>
    {products.length === 0 ? <Card><EmptyState icon={SearchX} title="No encontramos productos" description="Crea un producto o cambia los filtros." action="Crear producto" onAction={() => setOpen(true)} /></Card> : <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{products.map((product) => { const sold = data?.sales.flatMap((sale) => sale.items).filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0) ?? 0; return <Card key={product.id} className="overflow-hidden"><div className="flex h-32 items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200">{product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" /> : <span className="font-display text-4xl font-black text-stone-300">K</span>}</div><div className="p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-display font-bold">{product.name}</p><p className="mt-1 text-xs text-stone-400">{product.sku ?? 'Sin SKU'} · {product.category}</p></div><Badge tone={product.status === 'active' ? 'success' : 'neutral'}>{product.status === 'inactive' ? 'Inactivo' : 'A pedido'}</Badge></div><div className="mt-5 grid grid-cols-3 gap-2"><Mini label="Precio" value={formatCurrency(product.salePrice)} /><Mini label="Margen est." value={formatCurrency(product.salePrice - product.estimatedCost)} /><Mini label="Vendidos" value={String(sold)} /></div><div className="mt-5 flex gap-2"><Button className="flex-1" variant="secondary" size="sm" onClick={() => setEditing(product)}><Pencil className="size-4" />Editar</Button>{product.status === 'active' && <Button variant="ghost" size="icon" onClick={() => setDeactivating(product)} aria-label="Desactivar"><Archive className="size-4" /></Button>}</div></div></Card> })}</section>}
    {(open || editing) && <ProductFormModal product={editing} onClose={close} />}<ConfirmDialog open={Boolean(deactivating)} onClose={() => setDeactivating(undefined)} onConfirm={deactivate} loading={busy} title="¿Desactivar este producto?" description="No aparecerá en nuevas ventas, pero sus ventas e historial se conservarán." confirmLabel="Desactivar" />
  </div>
}
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-stone-50 p-2.5"><p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">{label}</p><p className="mt-1 truncate text-sm font-extrabold">{value}</p></div> }
