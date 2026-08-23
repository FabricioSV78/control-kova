import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const productsDirectory = path.join(projectRoot, 'public', 'productos')
const catalogDirectory = path.join(productsDirectory, 'catalogo')
const manifestPath = path.join(productsDirectory, 'manifest.json')
const supportedExtensions = new Set(['.avif', '.jpeg', '.jpg', '.png', '.webp'])
const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' })

await mkdir(productsDirectory, { recursive: true })
await mkdir(catalogDirectory, { recursive: true })

const entries = await readdir(catalogDirectory, { withFileTypes: true })
const folders = entries
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('_'))
  .sort((left, right) => collator.compare(left.name, right.name))

const manifest = { products: {}, outfits: {} }

for (const folder of folders) {
  const folderPath = path.join(catalogDirectory, folder.name)
  const files = (await readdir(folderPath, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase()))
    .sort((left, right) => collator.compare(left.name, right.name))

  if (!files.length) continue

  const isOutfit = /^outfit[-_ ]/i.test(folder.name)
  const productName = isOutfit ? folder.name.replace(/^outfit[-_ ]*/i, '') : folder.name
  const target = isOutfit ? manifest.outfits : manifest.products
  target[normalizeName(productName)] = await Promise.all(files.map(async (file) => {
    const filePath = path.join(folderPath, file.name)
    const details = await stat(filePath)
    const encodedFolder = encodeURIComponent(folder.name)
    const encodedFile = encodeURIComponent(file.name)
    return `/productos/catalogo/${encodedFolder}/${encodedFile}?v=${Math.trunc(details.mtimeMs)}-${details.size}`
  }))
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(`Catálogo generado: ${Object.keys(manifest.products).length} producto(s) y ${Object.keys(manifest.outfits).length} outfit(s).`)

function normalizeName(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}
