import { getLocale } from '@/lib/i18n/server'
import InformationContent from '@/components/information/page'
import { informationPages } from '@/lib/agents/content'
import { buildPageMetadata } from '@/lib/seo/metadata'

const path = '/about'
const page = informationPages[path]
export async function generateMetadata() { return buildPageMetadata({ title: page.title, description: page.description, path, locale: await getLocale() }) }
export default function Page() { return <InformationContent page={page} /> }
