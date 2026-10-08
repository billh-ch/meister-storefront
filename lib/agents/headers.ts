/** Publish the intended HTML variations in the routing manifest as well as
 * proxy.ts. Vercel currently overwrites HTML Vary even with these rules;
 * verify final deployed headers rather than assuming manifest rules survive. */
export function buildAgentNegotiationHeaders() {
  const vary = 'Accept, rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch'
  return ['/', '/about', '/contact', '/privacy', '/docs', '/docs/agents', '/docs/mcp', '/docs/auth',
    '/shop', '/fins', '/suits', '/guns', '/accessories', '/merch', '/products/:slug']
    .map(source => ({ source, headers: [{ key: 'Vary', value: vary }] }))
}
