import { createHash } from 'node:crypto'
import { readdir, readFile, mkdir, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = path.join(root, 'public/optimized')
const manifestPath = path.join(root, 'lib/images/generated-manifest.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const widths = [320, 640, 960, 1600]
const maxBytes = 12 * 1024 * 1024
await mkdir(output, { recursive: true })

async function generate(src, bytes) {
  const hash = createHash('sha256').update(src).update(bytes).digest('hex').slice(0, 24)
  const metadata = await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata()
  if (!metadata.width || !metadata.height) throw new Error('Invalid raster image')
  if (metadata.pages && metadata.pages > 1) throw new Error('Keep animated originals')
  const naturalWidth = metadata.orientation && metadata.orientation >= 5 ? metadata.height : metadata.width
  const sizes = [...new Set(widths.map(width => Math.min(width, naturalWidth)))]
  const images = []
  for (const width of sizes) {
    const filename = `${hash}-${width}.webp`
    const target = path.join(output, filename)
    if (!await stat(target).catch(() => null)) {
      await sharp(bytes, { limitInputPixels: 40_000_000 }).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78, effort: 4 }).toFile(target)
    }
    images.push({ width, src: '/optimized/' + filename })
  }
  manifest[src] = images
}

async function local(directory) {
  for (const file of await readdir(path.join(root, 'public', directory), { withFileTypes: true })) {
    const relative = path.posix.join(directory, file.name)
    if (file.isDirectory()) await local(relative)
    else if (/\.(?:jpe?g|png|webp|avif)$/i.test(file.name)) await generate('/' + relative, await readFile(path.join(root, 'public', relative)))
  }
}
await local('images')
await local('gear-finder')

let downloaded = 0, failed = 0
if (process.env.MEDIA_MANIFEST_URL) {
  const endpoint = new URL(process.env.MEDIA_MANIFEST_URL)
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) throw new Error('Invalid media inventory endpoint')
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(30_000), redirect: 'error' })
  if (!response.ok) throw new Error(`Public media inventory unavailable (${response.status})`)
  const inventory = await response.json()
  if (inventory.version !== 1 || !Array.isArray(inventory.images) || inventory.images.length > 1000) throw new Error('Invalid media inventory')
  const origin = new URL(process.env.NEXT_PUBLIC_WC_URL || 'https://rpiwordpress.kudu-ulmer.ts.net:8443').origin
  let index = 0
  async function worker() {
    while (index < inventory.images.length) {
      const item = inventory.images[index++]
      try {
        const src = new URL(item.src)
        if (src.origin !== origin || src.username || src.password || !src.pathname.startsWith('/wp-content/uploads/') || !/\.(?:jpe?g|png|webp|avif|gif)$/i.test(src.pathname) || [...src.searchParams.keys()].some(key => key !== 'v')) throw new Error('Invalid public image source')
        if (manifest[src.href] && (await Promise.all(manifest[src.href].map(image => stat(path.join(root, 'public', image.src)).catch(() => null)))).every(Boolean)) continue
        delete manifest[src.href]
        const image = await fetch(src, { signal: AbortSignal.timeout(25_000), redirect: 'error' })
        if (!image.ok || !/^image\/(?:jpeg|png|webp|avif|gif)(?:;|$)/i.test(image.headers.get('content-type') ?? '') || Number(image.headers.get('content-length') ?? 0) > maxBytes) throw new Error('Invalid image response')
        const reader = image.body.getReader(), chunks = []; let size = 0
        while (true) {
          const part = await reader.read(); if (part.done) break
          size += part.value.byteLength
          if (size > maxBytes) { await reader.cancel(); throw new Error('Image too large') }
          chunks.push(Buffer.from(part.value))
        }
        await generate(src.href, Buffer.concat(chunks)); downloaded++
      } catch {
        failed++ // An unknown or unavailable image keeps its original URL at runtime.
      }
    }
  }
  await Promise.all([worker(), worker(), worker()])
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
console.log(`Responsive images ready: ${Object.keys(manifest).length} sources; ${downloaded} refreshed, ${failed} origin fallbacks`)
