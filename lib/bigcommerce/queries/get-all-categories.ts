import { bcFetch } from '../client'

interface BcImage {
  url: string
}

export interface BcCategoryCustomField {
  entityId: number
  name: string
  value: string
}

export interface BcCategory {
  entityId: number
  name: string
  path: string
  image: BcImage | null
  customFields: { edges: Array<{ node: BcCategoryCustomField }> }
}

interface BcCategoryTreeItem {
  entityId: number
  name: string
  path: string
  image: BcImage | null
}

interface CategoryTreeResponse {
  site: {
    categoryTree: BcCategoryTreeItem[]
  }
}

interface CategoryByPathResponse {
  site: {
    route: {
      node: BcCategory | null
    }
  }
}

const CATEGORY_TREE_QUERY = `
  query GetCategoryTree {
    site {
      categoryTree {
        entityId
        name
        path
        image {
          url(width: 1200)
        }
      }
    }
  }
`

const CATEGORY_BY_PATH_QUERY = `
  query GetCategoryByPath($path: String!) {
    site {
      route(path: $path) {
        node {
          ... on Category {
            entityId
            name
            path
            image {
              url(width: 1200)
            }
            customFields {
              edges {
                node {
                  entityId
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`

async function fetchCategoryByPath(path: string): Promise<BcCategory | null> {
  const data = await bcFetch<CategoryByPathResponse>(
    CATEGORY_BY_PATH_QUERY,
    { path },
    { revalidate: 300, tags: ['categories'] },
  )
  return data.site.route.node
}

export async function fetchCategories(): Promise<BcCategory[]> {
  const treeData = await bcFetch<CategoryTreeResponse>(
    CATEGORY_TREE_QUERY,
    undefined,
    { revalidate: 300, tags: ['categories'] },
  )

  const treeItems = treeData.site.categoryTree

  const categories = await Promise.all(
    treeItems.map(item => fetchCategoryByPath(item.path)),
  )

  return categories.filter((c): c is BcCategory => c !== null)
}
