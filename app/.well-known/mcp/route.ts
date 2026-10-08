import { handleMcpRequest } from '@/lib/agents/mcp'
import { getPublishedProducts, getPublishedProductBySlug } from '@/lib/woocommerce'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const handle = (request: Request) => handleMcpRequest(request, { list: getPublishedProducts, detail: getPublishedProductBySlug })
export { handle as POST, handle as GET, handle as DELETE }
