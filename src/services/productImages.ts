import type { Product, ProductImage } from '../types/domain'

interface ProductImageManifest {
  products: Record<string, string[]>
  outfits: Record<string, string[]>
}

let manifestPromise: Promise<ProductImageManifest> | null = null

export function productImageFolder(productName: string | null | undefined): string | null {
  const normalized = productName?.trim()
  return normalized ? `/productos/catalogo/${normalized}/` : null
}

export function outfitImageFolder(productName: string | null | undefined): string | null {
  const normalized = productName?.trim()
  return normalized ? `/productos/catalogo/Outfit-${normalized}/` : null
}

export async function loadProductImageManifest(): Promise<ProductImageManifest> {
  if (!manifestPromise) manifestPromise = fetch('/productos/manifest.json', { cache: 'no-cache' })
    .then(async (response) => {
      if (!response.ok) return { products: {}, outfits: {} }
      const data: unknown = await response.json()
      if (!data || typeof data !== 'object' || Array.isArray(data)) return { products: {}, outfits: {} }
      const candidate = data as Partial<ProductImageManifest>
      return {
        products: candidate.products && typeof candidate.products === 'object' ? candidate.products : {},
        outfits: candidate.outfits && typeof candidate.outfits === 'object' ? candidate.outfits : {},
      }
    })
    .catch(() => ({ products: {}, outfits: {} }))
  return manifestPromise
}

function normalizeName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function toProductImages(urls: string[], key: string, kind: 'product' | 'outfit'): ProductImage[] {
  return urls.map((url, sortOrder) => ({
    id: `${kind}-${key}-${sortOrder}`,
    url,
    storagePath: null,
    sortOrder,
  }))
}

export function attachLocalProductImages(products: Product[], manifest: ProductImageManifest): Product[] {
  return products.map((product) => {
    const key = normalizeName(product.name)
    return {
      ...product,
      images: toProductImages(manifest.products[key] ?? [], key, 'product'),
      outfitImages: toProductImages(manifest.outfits[key] ?? [], key, 'outfit'),
    }
  })
}
