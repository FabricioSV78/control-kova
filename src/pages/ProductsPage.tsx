import {
  Archive,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Pencil,
  Plus,
  RotateCcw,
  SearchX,
} from 'lucide-react'
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
  const { data, service, refresh } = useWorkspace()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [open, setOpen] = useState(params.get('new') === '1')
  const [editing, setEditing] = useState<Product>()
  const [deactivating, setDeactivating] = useState<Product>()
  const [activatingId, setActivatingId] = useState<string>()
  const [draggedId, setDraggedId] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('active')

  const products = useMemo(() => {
    const query = search.toLowerCase()
    return (data?.products ?? []).filter(
      (product) =>
        (!query ||
          product.name.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query)) &&
        (status === 'all' || product.status === status),
    )
  }, [data?.products, search, status])

  const canReorder = status === 'active' && search.trim() === ''

  const close = () => {
    setOpen(false)
    setEditing(undefined)
    if (params.get('new')) navigate('/productos', { replace: true })
  }

  const deactivate = async () => {
    if (!deactivating) return
    setBusy(true)
    try {
      await service.deactivateProduct(deactivating.id)
      await refresh()
      toast.success('Producto desactivado.')
      setDeactivating(undefined)
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'No se pudo desactivar.')
    } finally {
      setBusy(false)
    }
  }

  const activate = async (product: Product) => {
    setActivatingId(product.id)
    try {
      await service.activateProduct(product.id)
      await refresh()
      toast.success(`${product.name} está activo nuevamente.`)
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'No se pudo activar el producto.')
    } finally {
      setActivatingId(undefined)
    }
  }

  const saveOrder = async (orderedProducts: Product[]) => {
    setSavingOrder(true)
    try {
      await service.reorderProducts(orderedProducts.map((product) => product.id))
      await refresh()
      toast.success('Orden del catálogo guardado.')
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'No se pudo guardar el orden.')
    } finally {
      setSavingOrder(false)
      setDraggedId(undefined)
    }
  }

  const moveTo = (sourceId: string, targetId: string) => {
    if (!canReorder || sourceId === targetId || savingOrder) return

    const sourceIndex = products.findIndex((product) => product.id === sourceId)
    const targetIndex = products.findIndex((product) => product.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0) return

    const ordered = [...products]
    const [moved] = ordered.splice(sourceIndex, 1)
    if (!moved) return
    ordered.splice(targetIndex, 0, moved)
    void saveOrder(ordered)
  }

  const moveBy = (productId: string, direction: -1 | 1) => {
    const sourceIndex = products.findIndex((product) => product.id === productId)
    const target = products[sourceIndex + direction]
    if (sourceIndex < 0 || !target) return
    moveTo(productId, target.id)
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Catálogo"
        title="Productos"
        description="Arrastra los productos activos para elegir cómo aparecerán en el catálogo."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Nuevo producto
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar nombre, SKU o categoría…"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold"
        >
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="all">Todos</option>
        </select>
      </div>

      {canReorder && products.length > 1 && (
        <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500">
          <GripVertical className="size-4 shrink-0" />
          <span className="hidden sm:inline">
            Arrastra una tarjeta hasta su nueva posición. El cambio se guarda automáticamente.
          </span>
          <span className="sm:hidden">
            Usa las flechas de cada tarjeta para cambiar su posición.
          </span>
        </div>
      )}

      {products.length === 0 ? (
        <Card>
          <EmptyState
            icon={SearchX}
            title="No encontramos productos"
            description="Crea un producto o cambia los filtros."
            action="Crear producto"
            onAction={() => setOpen(true)}
          />
        </Card>
      ) : (
        <section
          className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 ${
            savingOrder ? 'pointer-events-none opacity-70' : ''
          }`}
          aria-busy={savingOrder}
        >
          {products.map((product, index) => {
            const sold =
              data?.sales
                .flatMap((sale) => sale.items)
                .filter((item) => item.productId === product.id)
                .reduce((sum, item) => sum + item.quantity, 0) ?? 0
            const cover = product.images[0]?.url

            return (
              <Card
                key={product.id}
                draggable={canReorder}
                onDragStart={(event) => {
                  if (!canReorder) return
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', product.id)
                  setDraggedId(product.id)
                }}
                onDragEnd={() => setDraggedId(undefined)}
                onDragOver={(event) => {
                  if (canReorder) event.preventDefault()
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  const sourceId = event.dataTransfer.getData('text/plain') || draggedId
                  if (sourceId) moveTo(sourceId, product.id)
                }}
                className={`overflow-hidden transition ${
                  canReorder ? 'cursor-grab active:cursor-grabbing' : ''
                } ${draggedId === product.id ? 'scale-[0.98] opacity-45' : ''}`}
              >
                <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200">
                  {cover ? (
                    <img src={cover} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-4xl font-black text-stone-300">K</span>
                  )}

                  {canReorder && (
                    <span
                      className="absolute left-2 top-2 hidden rounded-lg bg-black/70 p-1.5 text-white sm:block"
                      title="Arrastrar para ordenar"
                    >
                      <GripVertical className="size-4" />
                    </span>
                  )}

                  {canReorder && (
                    <div className="absolute bottom-2 left-2 flex gap-1 sm:hidden">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveBy(product.id, -1)}
                        className="rounded-lg bg-black/75 p-2 text-white disabled:opacity-30"
                        aria-label={`Subir ${product.name}`}
                      >
                        <ChevronUp className="size-4" />
                      </button>
                      <button
                        type="button"
                        disabled={index === products.length - 1}
                        onClick={() => moveBy(product.id, 1)}
                        className="rounded-lg bg-black/75 p-2 text-white disabled:opacity-30"
                        aria-label={`Bajar ${product.name}`}
                      >
                        <ChevronDown className="size-4" />
                      </button>
                    </div>
                  )}

                  {product.images.length > 0 && (
                    <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
                      {product.images.length} foto{product.images.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display font-bold">{product.name}</p>
                      <p className="mt-1 text-xs text-stone-400">
                        {product.sku ?? 'Sin SKU'} · {product.category}
                      </p>
                    </div>
                    <Badge tone={product.status === 'active' ? 'success' : 'neutral'}>
                      {product.status === 'inactive' ? 'Inactivo' : 'A pedido'}
                    </Badge>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <Mini label="Precio" value={formatCurrency(product.salePrice)} />
                    <Mini
                      label="Margen est."
                      value={formatCurrency(product.salePrice - product.estimatedCost)}
                    />
                    <Mini label="Vendidos" value={String(sold)} />
                  </div>

                  <div className="mt-5 flex gap-2">
                    <Button
                      className="flex-1"
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditing(product)}
                    >
                      <Pencil className="size-4" />
                      Editar
                    </Button>
                    {product.status === 'active' ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeactivating(product)}
                        aria-label="Desactivar"
                      >
                        <Archive className="size-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={activatingId === product.id}
                        onClick={() => void activate(product)}
                      >
                        <RotateCcw className="size-4" />
                        Activar
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </section>
      )}

      {(open || editing) && <ProductFormModal product={editing} onClose={close} />}
      <ConfirmDialog
        open={Boolean(deactivating)}
        onClose={() => setDeactivating(undefined)}
        onConfirm={deactivate}
        loading={busy}
        title="¿Desactivar este producto?"
        description="No aparecerá en nuevas ventas, pero sus ventas e historial se conservarán."
        confirmLabel="Desactivar"
      />
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-50 p-2.5">
      <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">{label}</p>
      <p className="mt-1 truncate text-sm font-extrabold">{value}</p>
    </div>
  )
}
