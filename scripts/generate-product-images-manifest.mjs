import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const projectRoot = process.cwd()
const publicDirectory = path.join(projectRoot, 'public')
const productsDirectory = path.join(publicDirectory, 'productos')
const catalogDirectory = path.join(productsDirectory, 'catalogo')
const optimizedDirectory = path.join(productsDirectory, 'optimized')
const manifestPath = path.join(productsDirectory, 'manifest.json')
const supportedExtensions = new Set(['.avif', '.jpeg', '.jpg', '.png', '.webp'])
const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' })
const outputVersion = 'webp1'

await mkdir(productsDirectory, { recursive: true })
await mkdir(catalogDirectory, { recursive: true })
await rm(optimizedDirectory, { recursive: true, force: true })
await mkdir(optimizedDirectory, { recursive: true })

const entries = await readdir(catalogDirectory, { withFileTypes: true })
const folders = entries
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('_'))
  .sort((left, right) => collator.compare(left.name, right.name))

const manifest = { products: {}, outfits: {} }
let sourceBytes = 0
let optimizedBytes = 0
let convertedImages = 0

for (const folder of folders) {
  const folderPath = path.join(catalogDirectory, folder.name)
  const files = (await readdir(folderPath, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase()))
    .sort((left, right) => collator.compare(left.name, right.name))

  if (!files.length) continue

  const outputFolder = path.join(optimizedDirectory, folder.name)
  await mkdir(outputFolder, { recursive: true })

  const isOutfit = /^outfit[-_ ]/i.test(folder.name)
  const productName = isOutfit ? folder.name.replace(/^outfit[-_ ]*/i, '') : folder.name
  const target = isOutfit ? manifest.outfits : manifest.products

  target[normalizeName(productName)] = await Promise.all(
    files.map(async (file) => {
      const inputPath = path.join(folderPath, file.name)
      const outputName = `${path.parse(file.name).name}.webp`
      const outputPath = path.join(outputFolder, outputName)
      const inputDetails = await stat(inputPath)

      await sharp(inputPath)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82, effort: 5, smartSubsample: true })
        .toFile(outputPath)

      const outputDetails = await stat(outputPath)
      sourceBytes += inputDetails.size
      optimizedBytes += outputDetails.size
      convertedImages += 1

      return `/productos/optimized/${encodeURIComponent(folder.name)}/${encodeURIComponent(outputName)}?v=${outputVersion}-${Math.trunc(inputDetails.mtimeMs)}-${inputDetails.size}`
    }),
  )
}

await Promise.all([
  optimizeAsset('kova-logo.png', 'kova-logo.webp', {
    width: 1250,
    height: 1250,
    quality: 88,
  }),
  optimizeAsset('kova-portada.png', 'kova-portada.webp', {
    width: 2200,
    height: 1200,
    quality: 84,
  }),
  optimizeAsset('kova-portada-mobile.png', 'kova-portada-mobile.webp', {
    width: 1080,
    height: 1920,
    quality: 84,
  }),
  optimizeSocialAsset('kova-catalogo-social.png', 'kova-catalogo-social.webp'),
])

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

const savings = sourceBytes > 0 ? Math.round((1 - optimizedBytes / sourceBytes) * 100) : 0
console.log(
  `Catálogo WebP generado: ${Object.keys(manifest.products).length} producto(s), ${Object.keys(manifest.outfits).length} outfit(s), ${convertedImages} imagen(es), ${formatMiB(sourceBytes)} → ${formatMiB(optimizedBytes)} (${savings}% menos).`,
)

async function optimizeAsset(sourceName, outputName, options) {
  const sourcePath = path.join(publicDirectory, 'assets', sourceName)
  const outputPath = path.join(publicDirectory, 'assets', outputName)

  await sharp(sourcePath)
    .rotate()
    .resize({
      width: options.width,
      height: options.height,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: options.quality, effort: 5, smartSubsample: true })
    .toFile(outputPath)
}

async function optimizeSocialAsset(sourceName, outputName) {
  const sourcePath = path.join(publicDirectory, 'assets', sourceName)
  const outputPath = path.join(publicDirectory, 'assets', outputName)

  await sharp(sourcePath)
    .rotate()
    .resize({
      width: 1200,
      height: 630,
      fit: 'contain',
      background: { r: 5, g: 5, b: 5, alpha: 1 },
    })
    .webp({ quality: 88, effort: 5, smartSubsample: true })
    .toFile(outputPath)
}

function normalizeName(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function formatMiB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
