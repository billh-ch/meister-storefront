export type ImageManifest = Record<string, readonly { width: number; src: string }[]>

export function imageVariants(src: string, manifest: ImageManifest) {
  return (manifest[src] ?? []).filter(image => image.width > 0 && Number.isFinite(image.width) && /^\/optimized\/[a-f0-9]{20,64}-\d+\.webp$/.test(image.src)).sort((a, b) => a.width - b.width)
}

/** Exact source/version matching keeps new and replaced media on the origin fallback. */
export function selectImageVariant(src: string, width: number, manifest: ImageManifest): string {
  if (!Number.isFinite(width) || width <= 0) return src
  const choices = imageVariants(src, manifest)
  return (choices.find(image => image.width >= width) ?? choices.at(-1))?.src ?? src
}
