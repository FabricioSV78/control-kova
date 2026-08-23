import { supabase } from '../lib/supabase'
import type { DeliveryShowcase, Product } from '../types/domain'
import { attachLocalProductImages, loadProductImageManifest } from './productImages'

export interface CatalogData {
  businessName: string
  whatsappNumber: string | null
  products: Product[]
  deliveries: DeliveryShowcase[]
}

interface PublicCatalogPayload {
  business: {
    id: string
    name: string
    whatsapp_number: string | null
  }
  products: Array<{
    id: string
    name: string
    description: string | null
    sku: string | null
    category: string
    sale_price: number | string
    sort_order?: number
    created_at: string
    updated_at: string
  }>
  deliveries?: Array<{
    id: string
    title: string
    image_url: string
    created_at: string
  }>
}

const necklaceProductNames = new Set(['kova noctis 45', 'kova eclipse 45'])

function resolveCatalogCategory(productName: string, category: string): string {
  return necklaceProductNames.has(productName.trim().toLocaleLowerCase('es')) ? 'Collares' : category
}

export async function loadPublicCatalog(): Promise<CatalogData> {
  if (!supabase) throw new Error('El catálogo todavía no está conectado a Supabase.')

  const [result, imageManifest] = await Promise.all([
    supabase.rpc('get_public_catalog', { p_slug: 'kova' }),
    loadProductImageManifest(),
  ])
  if (result.error) throw new Error('No se pudo cargar la información pública de KOVA.')
  const payload = result.data as unknown as PublicCatalogPayload | null
  if (!payload?.business || !Array.isArray(payload.products)) throw new Error('El catálogo KOVA todavía no está publicado.')

  return {
    businessName: payload.business.name,
    whatsappNumber: payload.business.whatsapp_number,
    deliveries: (payload.deliveries ?? []).map((delivery) => ({
      id: delivery.id,
      businessId: payload.business.id,
      title: delivery.title,
      imageUrl: delivery.image_url,
      storagePath: null,
      createdAt: delivery.created_at,
    })),
    products: attachLocalProductImages(payload.products.map((product) => ({
      id: product.id,
      businessId: payload.business.id,
      name: product.name,
      description: product.description,
      sku: product.sku,
      category: resolveCatalogCategory(product.name, product.category),
      salePrice: Number(product.sale_price),
      estimatedCost: 0,
      status: 'active',
      sortOrder: Number(product.sort_order ?? 0),
      images: [],
      outfitImages: [],
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    })), imageManifest),
  }
}
