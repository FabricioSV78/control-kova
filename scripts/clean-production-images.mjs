import { readdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'

const distDirectory = path.join(process.cwd(), 'dist')
const rasterSourcePattern = /\.(?:png|jpe?g)$/i
const runtimeTextPattern = /\.(?:css|html|js|json)$/i

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
