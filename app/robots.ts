import type { MetadataRoute } from 'next'
import { buildRobots } from '@/lib/seo/metadata'

export default function robots(): MetadataRoute.Robots {
  return buildRobots()
}
