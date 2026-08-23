import { ImagePlus, PackageCheck, Plus, Trash2, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/FormField'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { Pagination } from '../components/ui/Pagination'
import { SearchInput } from '../components/ui/SearchInput'
import { useWorkspace } from '../hooks/useWorkspace'
import type { DeliveryShowcase } from '../types/domain'

const PAGE_SIZE = 12

export function DeliveriesPage() {
  const { data, service, refresh } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState<DeliveryShowcase | null>(null)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const deliveries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')
    return (data?.deliveries ?? []).filter((delivery) => !query || delivery.title.toLocaleLowerCase('es').includes(query))
  }, [data?.deliveries, search])
  const pageCount = Math.max(1, Math.ceil(deliveries.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visibleDeliveries = deliveries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  if (!data) return null

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await service.deleteDeliveryShowcase(deleting.id)
      await refresh()
      setDeleting(null)
      toast.success('Entrega eliminada del catálogo.')
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'No se pudo eliminar la entrega.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="space-y-7">
    <PageHeader eyebrow="Catálogo público" title="Entregas" description="Publica pedidos reales enviados o entregados por KOVA." actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" />Nueva entrega</Button>} />
    {data.deliveries.length > 0 && <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Buscar por producto o ciudad…" /><p className="text-xs font-semibold text-stone-400">{data.deliveries.length} publicacion{data.deliveries.length === 1 ? '' : 'es'}</p></div>}
    {data.deliveries.length === 0
      ? <Card><EmptyState icon={PackageCheck} title="Aún no hay entregas publicadas" description="Sube una foto vertical y añade un texto breve, por ejemplo: KOVA Urban Black para Lima." action="Publicar entrega" onAction={() => setOpen(true)} /></Card>
      : deliveries.length === 0
        ? <Card><EmptyState icon={PackageCheck} title="No encontramos entregas" description="Prueba con otro producto o ciudad." /></Card>
        : <><section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{visibleDeliveries.map((delivery) => <Card key={delivery.id} className="group overflow-hidden"><div className="relative aspect-[3/4] bg-stone-100"><img src={delivery.imageUrl} alt={delivery.title} loading="lazy" decoding="async" className="h-full w-full object-cover" /><button type="button" onClick={() => setDeleting(delivery)} className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-white/90 text-red-600 shadow-sm backdrop-blur transition hover:bg-red-600 hover:text-white" aria-label={`Eliminar ${delivery.title}`}><Trash2 className="size-4" /></button></div><div className="p-4"><p className="font-display text-base font-bold leading-snug">{delivery.title}</p><p className="mt-1 text-xs text-stone-400">Visible en el catálogo</p></div></Card>)}</section><Pagination page={currentPage} pageCount={pageCount} total={deliveries.length} onChange={setPage} /></>}
    <DeliveryFormModal open={open} onClose={() => setOpen(false)} onSaved={async () => { setOpen(false); await refresh() }} />
    <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} loading={busy} title="¿Eliminar esta entrega?" description="La foto dejará de aparecer en el catálogo público." confirmLabel="Eliminar" />
  </div>
}

function DeliveryFormModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const { service } = useWorkspace()
  const [title, setTitle] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const previewRef = useRef<string | null>(null)

  useEffect(() => {
    return () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current) }
  }, [])

  const resetForm = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
    setTitle('')
    setImage(null)
    setPreview(null)
    setError(null)
  }

  const close = () => { resetForm(); onClose() }

  const selectImage = (file: File | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    const nextPreview = file ? URL.createObjectURL(file) : null
    previewRef.current = nextPreview
    setImage(file)
    setPreview(nextPreview)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const normalizedTitle = title.trim()
    if (normalizedTitle.length < 3 || normalizedTitle.length > 120) { setError('Escribe un texto de 3 a 120 caracteres.'); return }
    if (!image) { setError('Selecciona una foto de la entrega.'); return }
    setSaving(true)
    setError(null)
    try {
      await service.createDeliveryShowcase({ title: normalizedTitle, image })
      resetForm()
      await onSaved()
      toast.success('Entrega publicada en el catálogo.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo publicar la entrega.')
    } finally {
      setSaving(false)
    }
  }

  return <Modal open={open} onClose={close} title="Publicar una entrega" description="La imagen se optimizará automáticamente antes de guardarse.">
    <form onSubmit={submit} className="space-y-5">
      <Input label="Texto de la entrega" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="KOVA Urban Black para Lima" maxLength={120} required />
      <label className="block text-sm font-semibold text-stone-800"><span>Foto vertical <span className="text-red-600">*</span></span><span className="mt-2 block overflow-hidden rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-3 transition hover:border-stone-500">{preview ? <span className="relative mx-auto block aspect-[3/4] max-h-[470px] overflow-hidden rounded-xl bg-stone-200"><img src={preview} alt="Vista previa" className="h-full w-full object-cover" /><span className="absolute inset-x-3 bottom-3 rounded-full bg-black/70 px-4 py-2 text-center text-xs font-bold text-white backdrop-blur">Cambiar foto</span></span> : <span className="grid min-h-52 place-items-center text-center"><span><ImagePlus className="mx-auto size-8 text-stone-300" /><span className="mt-3 block font-bold text-stone-700">Seleccionar imagen</span><span className="mt-1 block text-xs font-normal text-stone-400">Recomendado 3:4 · JPG, PNG o WebP</span></span></span>}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => selectImage(event.target.files?.[0] ?? null)} /></span></label>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" onClick={close}>Cancelar</Button><Button type="submit" loading={saving}><Upload className="size-4" />Publicar</Button></div>
    </form>
  </Modal>
}
