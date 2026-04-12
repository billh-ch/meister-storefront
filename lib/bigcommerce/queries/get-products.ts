import { bcFetch } from '../client'

interface BcImage {
  url: string
}

interface BcMoney {
  value: number
  currencyCode: string
}

interface BcPrices {
  price: BcMoney
}

interface BcOptionValue {
  entityId: number
  label: string
  hexColors: string[]
}

interface BcVariantOption {
  entityId: number
  displayName: string
  values: { edges: Array<{ node: BcOptionValue }> }
}

interface BcVariant {
  entityId: number
  options: { edges: Array<{ node: BcVariantOption }> }
}

interface BcProductOption {
  entityId: number
  displayName: string
  values?: { edges: Array<{ node: { entityId: number; label: string } }> }
}

interface BcCategoryNode {
  entityId: number
  name: string
  path: string
}

interface BcCustomField {
  entityId: number
  name: string
  value: string
}

export interface BcProduct {
  entityId: number
  name: string
  path: string
  defaultImage: BcImage | null
  prices: BcPrices | null
  productOptions: { edges: Array<{ node: BcProductOption }> }
  variants: { edges: Array<{ node: BcVariant }> }
  categories: { edges: Array<{ node: BcCategoryNode }> }
  customFields: { edges: Array<{ node: BcCustomField }> }
}

interface GetProductsResponse {
  site: {
    products: {
      edges: Array<{ node: BcProduct }>
    }
  }
}

const GET_PRODUCTS_QUERY = `
  query GetProducts($first: Int!) {
    site {
      products(first: $first) {
        edges {
          node {
            entityId
            name
            path
            defaultImage {
              url(width: 600)
            }
            prices(currencyCode: EUR) {
              price {
                value
                currencyCode
              }
            }
            productOptions {
              edges {
                node {
                  entityId
                  displayName
                  ... on MultipleChoiceOption {
                    values {
                      edges {
                        node {
                          entityId
                          label
                        }
                      }
                    }
                  }
                }
              }
            }
            variants(first: 30) {
              edges {
                node {
                  entityId
                  options {
                    edges {
                      node {
                        entityId
                        displayName
                        values {
                          edges {
                            node {
                              entityId
                              label
                              hexColors
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            categories {
              edges {
                node {
                  entityId
                  name
                  path
                }
              }
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

export async function fetchProducts(first = 50): Promise<BcProduct[]> {
  const data = await bcFetch<GetProductsResponse>(
    GET_PRODUCTS_QUERY,
    { first },
    { revalidate: 60, tags: ['products'] },
  )
  return data.site.products.edges.map(edge => edge.node)
}
