/** Vercel serves prerendered HTML outside the Next response pipeline. Publish
 * these rules in the deployment routing manifest as well as setting them in
 * proxy.ts so both cached HTML and dynamic Markdown advertise negotiation. */
export function buildAgentNegotiationHeaders() {
  const vary = 'Accept, rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch'
  return ['/', '/about', '/contact', '/privacy', '/docs', '/docs/agents', '/docs/mcp', '/docs/auth',
    '/shop', '/fins', '/suits', '/guns', '/accessories', '/merch', '/products/:slug']
    .map(source => ({ source, headers: [{ key: 'Vary', value: vary }] }))
}
