/** Normal fetch revalidation stays at30/60s; physical TTL bounds failed refreshes. */
export const catalogCacheOptions = { appPrefix: 'meister-catalog-v2', ttlSeconds: 120, entryCacheTtlSeconds: 30 }
