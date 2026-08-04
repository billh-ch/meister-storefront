import { wcFetch } from '../client'

export interface WcImage {
  id: number
  src: string
  alt?: string
}

export interface WcCategory {
  id: number
  name: string
  slug: string
}

export interface WcProduct {
  id: number
  name: string
  slug: string
  price: string
  images: WcImage[]
  categories: WcCategory[]
  type: string
  status: string
}

export async function fetchProducts(perPage = 50): Promise<WcProduct[]> {
  return wcFetch<WcProduct[]>(
    '/products',
    { per_page: String(perPage), status: 'publish' },
    { revalidate: 60, tags: ['products'] },
  )
}
