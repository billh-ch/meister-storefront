import InformationContent from '@/components/information/page'
import { informationPages } from '@/lib/agents/content'
import { buildPageMetadata } from '@/lib/seo/metadata'

const path = '/docs/mcp'
const page = informationPages[path]
export const metadata = buildPageMetadata({ title: page.title, description: page.description, path })
export default function Page() { return <InformationContent page={page} /> }
