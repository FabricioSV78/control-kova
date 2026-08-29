import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const distDirectory = path.join(process.cwd(), 'dist')
const rasterSourcePattern = /\.(?:png|jpe?g)$/i
const runtimeTextPattern = /\.(?:css|html|js|json)$/i

await createCatalogSharePage()

const files = await walk(distDirectory)
const sourceImages = files.filter((file) => rasterSourcePattern.test(file))

await Promise.all(sourceImages.map((file) => rm(file, { force: true })))

const runtimeFiles = (await walk(distDirectory)).filter((file) => runtimeTextPattern.test(file))
const staleReferences = []

for (const file of runtimeFiles) {
  const contents = await readFile(file, 'utf8')
  if (/\.(?:png|jpe?g)(?:[?"')\s]|$)/i.test(contents)) {
    staleReferences.push(path.relative(distDirectory, file))
  }
}

if (staleReferences.length > 0) {
  throw new Error(
    `El build todavía contiene referencias PNG/JPG: ${staleReferences.join(', ')}`,
  )
}

console.log(`Build WebP limpio: ${sourceImages.length} archivo(s) PNG/JPG excluido(s) de dist.`)

async function createCatalogSharePage() {
  const indexPath = path.join(distDirectory, 'index.html')
  const catalogPath = path.join(distDirectory, 'catalogo.html')
  const catalogUrl = 'https://control-kova.pages.dev/catalogo'
  const imageUrl =
    'https://control-kova.pages.dev/assets/kova-catalogo-social.webp?v=2026082901'
  const title = 'Catálogo KOVA | Accesorios hechos a tu medida'
  const description =
    'Descubre pulseras, collares y outfits KOVA hechos a pedido. Elige tu diseño, indica tu ciudad y medida, y coordina tu compra por WhatsApp.'
  const baseHtml = await readFile(indexPath, 'utf8')
  const socialMetadata = `
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${catalogUrl}" />
    <meta property="og:locale" content="es_PE" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="KOVA Accesorios" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${catalogUrl}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:secure_url" content="${imageUrl}" />
    <meta property="og:image:type" content="image/webp" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Catálogo de pulseras y collares KOVA" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta name="twitter:image:alt" content="Catálogo de pulseras y collares KOVA" />`

  const catalogHtml = baseHtml
    .replace('<html lang="es">', '<html lang="es" prefix="og: https://ogp.me/ns#">')
    .replace(
      /<meta name="description" content="[^"]*" \/>/,
      `<meta name="description" content="${description}" />`,
    )
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace('  </head>', `${socialMetadata}\n  </head>`)

  await writeFile(catalogPath, catalogHtml, 'utf8')
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name)
      return entry.isDirectory() ? walk(target) : [target]
    }),
  )
  return nested.flat()
}
