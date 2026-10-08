import { buildLlmsTxt } from '@/lib/agents/content'
export const dynamic = 'force-dynamic'
export function GET() {
  return new Response(buildLlmsTxt(), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
}
