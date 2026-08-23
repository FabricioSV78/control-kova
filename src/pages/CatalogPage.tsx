import { ArrowDown, ArrowRight, ChevronLeft, ChevronRight, Heart, MapPin, Menu, Ruler, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { loadPublicCatalog, type CatalogData } from '../services/catalogService'
import type { Product } from '../types/domain'
import { formatCurrency } from '../utils/format'

type GalleryKind = 'product' | 'outfit'
type ProductSelection = { product: Product; gallery: GalleryKind }

// Edita aquí los tres mensajes breves que aparecen debajo del hero.
const BRAND_VALUES = [
  { number: '01', title: 'A tu medida', text: 'Una pieza preparada especialmente para ti.' },
  { number: '02', title: 'Hecha a mano', text: 'Detalle y acabado en cada pieza.' },
  { number: '03', title: 'Envios a todo el Perú', text: 'Coordinación directa y personal.' },
]

// Edita aquí las preguntas frecuentes y sus respuestas.
const FAQ_ITEMS = [
  { question: '¿Cómo realizo mi pedido?', answer: 'Elige una pieza, presiona Comprar y completa tus datos. Te llevaremos a WhatsApp con la información lista para coordinar.' },
  { question: '¿Cómo indico la medida de mi pulsera?', answer: 'Mide el contorno de tu muñeca con una cinta métrica, sin apretar. Ingresa esa medida en centímetros al comprar.' },
  { question: '¿Los collares necesitan medida de muñeca?', answer: 'No. En los modelos de collar solo solicitamos tu nombre y ciudad para continuar el pedido.' },
  { question: '¿Realizan envíos a todo el Perú?', answer: 'Sí. Coordinamos el destino y los detalles de envío directamente por WhatsApp.' },
  { question: '¿Cuánto demora la preparación?', answer: 'Cada pieza se realiza a pedido. Te confirmaremos el tiempo estimado según el modelo y el destino antes de finalizar la compra.' },
]

const DESKTOP_NAV_ITEM_CLASS = 'inline-flex h-10 items-center justify-center rounded-full px-4 text-[9px] font-bold uppercase leading-none tracking-[0.18em] transition'

export function CatalogPage() {
  const [catalog, setCatalog] = useState<CatalogData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todos')
  const [selected, setSelected] = useState<ProductSelection | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [visibleDeliveryCount, setVisibleDeliveryCount] = useState(8)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'KOVA Accesorios | Catálogo'
    let active = true
    void loadPublicCatalog()
      .then((data) => { if (active) setCatalog(data) })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'No se pudo cargar el catálogo.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; document.title = previousTitle }
  }, [])

  useEffect(() => {
    if (!selected) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeWithEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', closeWithEscape)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeWithEscape) }
  }, [selected])

  const categories = useMemo(() => ['Todos', ...new Set(catalog?.products.map((product) => product.category) ?? [])], [catalog?.products])
  const products = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (catalog?.products ?? []).filter((product) =>
      (category === 'Todos' || product.category === category)
      && (!query || `${product.name} ${product.description ?? ''} ${product.category}`.toLowerCase().includes(query)),
    )
  }, [catalog?.products, category, search])
  const outfitProducts = useMemo(() => (catalog?.products ?? []).filter((product) => product.outfitImages.length > 0), [catalog?.products])

  const scrollToProducts = () => document.querySelector('#coleccion')?.scrollIntoView({ behavior: 'smooth' })

  return <div className="min-h-screen bg-[#f1f0ec] text-[#111]">
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-3 text-white sm:px-6 sm:pt-5">
      <div className="relative mx-auto flex max-w-[1480px] items-center justify-between gap-3">
        <a href="/catalogo" className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-white/15 bg-black/70 p-1.5 pr-4 shadow-xl shadow-black/15 backdrop-blur-xl">
          <img src="/assets/kova-logo.png?v=2026082302" alt="KOVA Accesorios" className="size-10 object-contain" />
          <div><p className="font-display text-sm font-extrabold tracking-[0.22em]">KOVA</p><p className="text-[6px] font-bold uppercase tracking-[0.38em] text-white/45">Accesorios</p></div>
        </a>
        <nav className="pointer-events-auto hidden items-center rounded-full border border-white/15 bg-black/70 p-1.5 shadow-xl shadow-black/15 backdrop-blur-xl md:flex">
          <a href="#coleccion" onClick={(event) => { event.preventDefault(); scrollToProducts() }} className={`${DESKTOP_NAV_ITEM_CLASS} hover:bg-white/10`}>Colección</a>
          {outfitProducts.length > 0 && <a href="#outfits" className={`${DESKTOP_NAV_ITEM_CLASS} hover:bg-white/10`}>Outfits</a>}
          {(catalog?.deliveries.length ?? 0) > 0 && <a href="#entregas" className={`${DESKTOP_NAV_ITEM_CLASS} hover:bg-white/10`}>Entregas</a>}
          <a href="#preguntas" className={`${DESKTOP_NAV_ITEM_CLASS} hover:bg-white/10`}>Preguntas</a>
          <a href="#coleccion" onClick={(event) => { event.preventDefault(); scrollToProducts() }} className={`${DESKTOP_NAV_ITEM_CLASS} bg-white text-black hover:bg-stone-200`}>Comprar</a>
        </nav>
        <button type="button" className="pointer-events-auto grid size-12 place-items-center rounded-full border border-white/15 bg-black/70 shadow-xl backdrop-blur-xl md:hidden" onClick={() => setMenuOpen((value) => !value)} aria-label="Abrir menú" aria-expanded={menuOpen}>{menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        {menuOpen && <nav className="pointer-events-auto absolute inset-x-0 top-16 rounded-3xl border border-white/15 bg-black/90 p-3 text-sm font-bold shadow-2xl backdrop-blur-xl md:hidden">
          <button onClick={() => { scrollToProducts(); setMenuOpen(false) }} className="block w-full rounded-2xl px-4 py-3 text-left hover:bg-white/10">Colección</button>
          {outfitProducts.length > 0 && <a href="#outfits" onClick={() => setMenuOpen(false)} className="block rounded-2xl px-4 py-3 hover:bg-white/10">Outfits</a>}
          {(catalog?.deliveries.length ?? 0) > 0 && <a href="#entregas" onClick={() => setMenuOpen(false)} className="block rounded-2xl px-4 py-3 hover:bg-white/10">Entregas</a>}
          <a href="#preguntas" onClick={() => setMenuOpen(false)} className="block rounded-2xl px-4 py-3 hover:bg-white/10">Preguntas frecuentes</a>
        </nav>}
      </div>
    </header>

    <main>
      <section className="relative min-h-[680px] overflow-hidden bg-black sm:min-h-[760px] lg:min-h-[820px]">
        <img src="/assets/kova-portada.png" alt="Colección de accesorios KOVA" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-[52%_center]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-black/15" />
        <div className="relative mx-auto flex min-h-[680px] max-w-[1480px] items-end px-5 pb-10 sm:min-h-[760px] sm:px-8 sm:pb-14 lg:min-h-[820px] lg:px-12">
          <div className="flex w-full justify-center text-white sm:justify-end">
            <button type="button" onClick={scrollToProducts} className="inline-flex h-12 w-fit items-center gap-4 rounded-full bg-white px-6 text-sm font-extrabold text-black transition duration-300 hover:gap-6 hover:bg-stone-200">Ver colección<ArrowDown className="size-4" /></button>
          </div>
        </div>
      </section>

      <section className="border-b border-black/10 bg-[#111] text-white">
        <div className="mx-auto grid max-w-[1480px] divide-y divide-white/10 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 lg:px-12">
          {BRAND_VALUES.map((value) => <BrandValue key={value.number} {...value} />)}
        </div>
      </section>

      <section id="coleccion" className="mx-auto max-w-[1480px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="grid gap-10 border-b border-black/15 pb-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div><p className="text-[9px] font-bold uppercase tracking-[0.36em] text-black/60">Colección KOVA</p><h2 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.045em] sm:text-6xl">Encuentra tu pieza.</h2></div>
          <label className="flex h-12 w-full items-center gap-3 border-b border-black/30 bg-transparent lg:w-72"><Search className="size-4 text-black/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/35" placeholder="Buscar" aria-label="Buscar productos" /></label>
        </div>
        <div className="mt-7 flex gap-2 overflow-x-auto pb-2">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] transition ${category === item ? 'bg-black text-white' : 'border border-black/15 hover:border-black/50'}`}>{item}</button>)}</div>

        {loading ? <div className="grid min-h-96 place-items-center"><div className="size-8 animate-spin rounded-full border-2 border-black/15 border-t-black" /></div>
          : error ? <div className="mt-12 border border-amber-300 bg-amber-50 p-8 text-center"><p className="font-bold text-amber-950">{error}</p><p className="mt-2 text-sm text-amber-800">Verifica las migraciones del catálogo en Supabase.</p></div>
            : products.length === 0 ? <div className="mt-12 border border-black/10 bg-white/50 p-14 text-center"><Heart className="mx-auto size-7 text-black/20" /><p className="mt-4 font-bold">Nuevos diseños muy pronto.</p></div>
              : <div className="mt-12 grid gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} onSelect={() => setSelected({ product, gallery: 'product' })} />)}</div>}
      </section>

      {outfitProducts.length > 0 && <section id="outfits" className="bg-white px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="mx-auto max-w-[1480px]">
          <div className="grid gap-6 border-b border-black/15 pb-10 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-[9px] font-bold uppercase tracking-[0.36em] text-black/60">Outfit ideas</p><h2 className="mt-4 font-display text-4xl font-extrabold leading-none tracking-[-0.045em] sm:text-6xl">KOVA en tu estilo.</h2></div><p className="max-w-sm text-sm leading-6 text-black/60">Inspiración para combinar cada pieza.</p></div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{outfitProducts.map((product) => <OutfitCard key={product.id} product={product} onSelect={() => setSelected({ product, gallery: 'outfit' })} />)}</div>
        </div>
      </section>}

      {(catalog?.deliveries.length ?? 0) > 0 && <section id="entregas" className="overflow-hidden bg-[#151515] px-5 py-20 text-white sm:px-8 sm:py-28 lg:px-12">
        <div className="mx-auto max-w-[1480px]">
          <div className="grid gap-6 border-b border-white/15 pb-10 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-[9px] font-bold uppercase tracking-[0.36em] text-white/60">Pedidos reales</p><h2 className="mt-4 font-display text-4xl font-extrabold leading-none tracking-[-0.045em] sm:text-6xl">KOVA llegando a ti.</h2></div><p className="max-w-sm text-sm leading-6 text-white/65">Piezas preparadas y entregadas para nuestros clientes.</p></div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{catalog?.deliveries.slice(0, visibleDeliveryCount).map((delivery) => <article key={delivery.id} className="group"><div className="relative aspect-[3/4] overflow-hidden rounded-[1.15rem] bg-white/5 sm:rounded-[1.5rem]"><img src={delivery.imageUrl} alt={delivery.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent px-3 pb-4 pt-16 sm:px-5 sm:pb-5 sm:pt-20"><p className="font-display text-sm font-extrabold leading-snug sm:text-lg">{delivery.title}</p></div></div></article>)}</div>
          {visibleDeliveryCount < (catalog?.deliveries.length ?? 0) && <div className="mt-10 flex justify-center"><button type="button" onClick={() => setVisibleDeliveryCount((count) => count + 8)} className="rounded-full border border-white/25 px-6 py-3 text-xs font-extrabold transition hover:bg-white hover:text-black">Ver más entregas</button></div>}
        </div>
      </section>}

      <section id="medida" className="overflow-hidden bg-[#0d0d0d] px-5 py-20 text-white sm:px-8 sm:py-28 lg:px-12">
        <div className="mx-auto max-w-[1480px]">
          <div className="grid gap-8 border-b border-white/15 pb-12 lg:grid-cols-[1.15fr_.85fr] lg:items-end"><div><p className="text-[9px] font-bold uppercase tracking-[0.36em] text-white/60">Tu medida</p><h2 className="mt-4 font-display text-4xl font-extrabold leading-none tracking-[-0.045em] sm:text-6xl">El ajuste perfecto<br />en tres pasos.</h2></div><p className="max-w-md text-sm leading-7 text-white/65 lg:justify-self-end">Usa una cinta métrica alrededor de tu muñeca, sin apretar.</p></div>
          <div className="grid md:grid-cols-3"><MeasureStep number="01" text="Rodea la muñeca." /><MeasureStep number="02" text="Anota los centímetros." /><MeasureStep number="03" text="Elige y compra." /></div>
        </div>
      </section>

      <section id="preguntas" className="bg-[#f1f0ec] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="mx-auto grid max-w-[1480px] gap-12 lg:grid-cols-[.72fr_1.28fr] lg:gap-20">
          <div><p className="text-[9px] font-bold uppercase tracking-[0.36em] text-black/60">Preguntas frecuentes</p><h2 className="mt-4 font-display text-4xl font-extrabold leading-none tracking-[-0.045em] sm:text-6xl">Antes de elegir.</h2><p className="mt-6 max-w-sm text-sm leading-7 text-black/60">Lo esencial para pedir tu pieza KOVA.</p></div>
          <div className="border-t border-black/15">{FAQ_ITEMS.map((item) => <FaqItem key={item.question} {...item} />)}</div>
        </div>
      </section>
    </main>

    <footer className="bg-[#0d0d0d] px-5 py-10 text-white sm:px-8 lg:px-12"><div className="mx-auto flex max-w-[1480px] flex-col gap-6 border-t border-white/10 pt-9 sm:flex-row sm:items-end sm:justify-between"><div className="flex items-center gap-3"><img src="/assets/kova-logo.png?v=2026082302" alt="" className="size-11 object-contain opacity-80" /><div><p className="font-display font-extrabold tracking-[0.22em]">KOVA</p><p className="text-[7px] uppercase tracking-[0.4em] text-white/60">Accesorios</p></div></div><p className="text-[9px] font-bold uppercase tracking-[0.24em] text-white/60">Hecho a mano · Perú</p></div></footer>

    {selected && <OrderModal product={selected.product} initialGallery={selected.gallery} whatsappNumber={catalog?.whatsappNumber ?? null} onClose={() => setSelected(null)} />}
  </div>
}

function BrandValue({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="flex gap-5 py-7 sm:px-7 sm:first:pl-0"><span className="text-[9px] font-bold tracking-widest text-white/55">{number}</span><div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs text-white/65">{text}</p></div></div>
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return <details className="group border-b border-black/15"><summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 font-display text-base font-extrabold sm:text-lg"><span>{question}</span><span className="grid size-8 shrink-0 place-items-center rounded-full border border-black/15 text-lg font-normal transition group-open:rotate-45">+</span></summary><p className="max-w-2xl pb-7 pr-12 text-sm leading-7 text-black/60">{answer}</p></details>
}

function ProductCard({ product, onSelect }: { product: Product; onSelect: () => void }) {
  const cover = product.images[0]?.url
  return <article className="group">
    <button type="button" onClick={onSelect} className="block w-full text-left">
      <div className="relative aspect-square overflow-hidden rounded-[1.5rem] bg-[#deddd8]">
        {cover ? <img src={cover} alt={product.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.035]" /> : <div className="grid h-full place-items-center bg-gradient-to-br from-[#242424] to-black"><img src="/assets/kova-logo.png?v=2026082302" alt="" className="w-1/3 object-contain opacity-25" /></div>}
        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] backdrop-blur">A pedido</span>
        {product.images.length > 1 && <span className="absolute right-4 top-4 rounded-full bg-black/65 px-3 py-1.5 text-[9px] font-bold text-white backdrop-blur">{product.images.length} fotos</span>}
        {product.outfitImages.length > 0 && <span className="absolute bottom-4 left-4 rounded-full bg-black/65 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur sm:bottom-20">Outfits</span>}
        <span className="absolute inset-x-4 bottom-4 hidden h-12 items-center justify-between rounded-full bg-white px-5 text-xs font-extrabold text-black opacity-0 transition duration-300 group-hover:opacity-100 sm:flex">Comprar<ArrowRight className="size-4" /></span>
      </div>
      <div className="mt-5 flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[0.22em] text-black/60">{product.category}</p><h3 className="mt-2 truncate font-display text-lg font-extrabold tracking-tight sm:text-xl">{product.name}</h3></div><p className="shrink-0 font-display text-lg font-extrabold">{formatCurrency(product.salePrice)}</p></div>
    </button>
    <button type="button" onClick={onSelect} className="mt-4 flex h-11 w-full items-center justify-between rounded-full bg-black px-5 text-xs font-extrabold text-white sm:hidden">Comprar<ArrowRight className="size-4" /></button>
  </article>
}

function OutfitCard({ product, onSelect }: { product: Product; onSelect: () => void }) {
  const cover = product.outfitImages[1] ?? product.outfitImages[0]
  return <button type="button" onClick={onSelect} className="group text-left"><div className="relative aspect-square overflow-hidden rounded-[1.25rem] bg-stone-200"><img src={cover?.url} alt={`Outfits con ${product.name}`} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]" /><span className="absolute inset-x-3 bottom-3 flex h-11 items-center justify-between rounded-full bg-black/75 px-4 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">Ver outfits<ArrowRight className="size-4" /></span></div><div className="mt-4 flex items-center justify-between gap-3"><p className="font-display text-base font-extrabold">{product.name}</p><span className="text-[10px] font-bold text-black/60">{product.outfitImages.length} looks</span></div></button>
}

function OrderModal({ product, initialGallery, whatsappNumber, onClose }: { product: Product; initialGallery: GalleryKind; whatsappNumber: string | null; onClose: () => void }) {
  const [gallery, setGallery] = useState<GalleryKind>(initialGallery)
  const [imageIndex, setImageIndex] = useState(0)
  const [customerName, setCustomerName] = useState('')
  const [city, setCity] = useState('')
  const [measurement, setMeasurement] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const images = gallery === 'outfit' ? product.outfitImages : product.images
  const requiresWristMeasurement = product.category.trim().toLocaleLowerCase('es').includes('pulsera')
  const changeGallery = (nextGallery: GalleryKind) => { setGallery(nextGallery); setImageIndex(0) }

  const submit = () => {
    const measure = Number(measurement.replace(',', '.'))
    const nextErrors: Record<string, string> = {}
    if (customerName.trim().length < 2) nextErrors.name = 'Ingresa tu nombre.'
    if (city.trim().length < 2) nextErrors.city = 'Ingresa tu ciudad.'
    if (requiresWristMeasurement && (!Number.isFinite(measure) || measure < 5 || measure > 50)) nextErrors.measurement = 'Ingresa una medida entre 5 y 50 cm.'
    if (!whatsappNumber) nextErrors.whatsapp = 'KOVA todavía no configuró su número de WhatsApp.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    const message = [
      'Hola KOVA 👋 Quiero pedir este producto:', '',
      `Producto: ${product.name}`,
      `Precio: ${formatCurrency(product.salePrice)}`,
      ...(requiresWristMeasurement ? [`Medida de muñeca: ${measure} cm`] : []),
      `Ciudad: ${city.trim()}`,
      `Nombre: ${customerName.trim()}`, '',
      `Catálogo: ${window.location.origin}/catalogo`,
    ].join('\n')
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-3 backdrop-blur-md sm:p-6" role="dialog" aria-modal="true" aria-label={`Comprar ${product.name}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="mx-auto grid min-h-full max-w-6xl place-items-center">
      <div className="relative w-full overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur" aria-label="Cerrar"><X className="size-5" /></button>
        <div className="grid lg:grid-cols-[1.08fr_.92fr]">
          <div className="bg-[#e9e8e4] p-3 sm:p-5">
            {product.outfitImages.length > 0 && <div className="mb-3 flex rounded-full bg-black/5 p-1"><button type="button" onClick={() => changeGallery('product')} className={`flex-1 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition ${gallery === 'product' ? 'bg-black text-white' : 'text-black/45'}`}>Producto · {product.images.length}</button><button type="button" onClick={() => changeGallery('outfit')} className={`flex-1 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition ${gallery === 'outfit' ? 'bg-black text-white' : 'text-black/45'}`}>Outfits · {product.outfitImages.length}</button></div>}
            <div className="relative aspect-square overflow-hidden rounded-[1.25rem] bg-black">
              {images[imageIndex] ? <img src={images[imageIndex].url} alt={product.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><img src="/assets/kova-logo.png?v=2026082302" alt="" className="w-1/3 object-contain opacity-30" /></div>}
              {images.length > 1 && <><GalleryButton direction="left" onClick={() => setImageIndex((value) => (value - 1 + images.length) % images.length)} /><GalleryButton direction="right" onClick={() => setImageIndex((value) => (value + 1) % images.length)} /></>}
            </div>
            {images.length > 1 && <div className="mt-3 grid grid-cols-4 gap-2">{images.map((image, index) => <button type="button" key={image.id} onClick={() => setImageIndex(index)} className={`aspect-square overflow-hidden rounded-xl border-2 transition ${index === imageIndex ? 'border-black' : 'border-transparent opacity-60 hover:opacity-100'}`}><img src={image.url} alt="" className="h-full w-full object-cover" /></button>)}</div>}
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-black/35">{product.category} · A pedido</p>
            <div className="mt-4 flex items-start justify-between gap-5"><h2 className="font-display text-3xl font-extrabold leading-tight tracking-[-0.04em] sm:text-4xl">{product.name}</h2><p className="shrink-0 font-display text-xl font-extrabold">{formatCurrency(product.salePrice)}</p></div>
            {product.description && <p className="mt-4 text-sm leading-6 text-black/50">{product.description}</p>}
            <div className="mt-8 space-y-4"><CatalogInput label="Nombre" value={customerName} onChange={setCustomerName} placeholder="Tu nombre" error={errors.name} /><CatalogInput label="Ciudad en Perú" value={city} onChange={setCity} placeholder="Lima, Arequipa, Trujillo…" error={errors.city} icon={MapPin} />{requiresWristMeasurement && <CatalogInput label="Medida de muñeca" value={measurement} onChange={setMeasurement} placeholder="Ej. 17.5 cm" error={errors.measurement} icon={Ruler} inputMode="decimal" />}</div>
            {errors.whatsapp && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">{errors.whatsapp}</p>}
            <button type="button" onClick={submit} className="mt-7 flex h-13 w-full items-center justify-between rounded-full bg-black px-6 text-sm font-extrabold text-white transition hover:bg-[#2a2a2a]">Comprar<ArrowRight className="size-4" /></button>
            <p className="mt-3 text-center text-[10px] text-black/35">Continuarás en WhatsApp para coordinar.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
}

function GalleryButton({ direction, onClick }: { direction: 'left' | 'right'; onClick: () => void }) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight
  return <button type="button" onClick={onClick} className={`absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-sm ${direction === 'left' ? 'left-3' : 'right-3'}`} aria-label={direction === 'left' ? 'Imagen anterior' : 'Imagen siguiente'}><Icon className="size-5" /></button>
}

function CatalogInput({ label, value, onChange, placeholder, error, icon: Icon, inputMode }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; error?: string; icon?: typeof MapPin; inputMode?: 'decimal' }) {
  return <label className="block"><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/55">{label}</span><span className={`mt-2 flex h-12 items-center gap-2 border-b bg-[#f7f6f3] px-4 ${error ? 'border-red-500' : 'border-black/15 focus-within:border-black'}`}>{Icon && <Icon className="size-4 text-black/35" />}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/30" /></span>{error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}</label>
}

function MeasureStep({ number, text }: { number: string; text: string }) {
  return <div className="border-b border-white/10 py-9 md:border-b-0 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0"><p className="font-display text-5xl font-extrabold tracking-[-0.06em] text-white/45">{number}</p><p className="mt-5 text-sm font-bold">{text}</p></div>
}
