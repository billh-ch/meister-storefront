import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import GearFinder from '@/components/gear-finder/finder'
import { getLocale } from '@/lib/i18n/server'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { loadGearCatalogue } from '@/lib/gear-finder/load-catalogue'

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Gear Finder — Wetsuits & Fins — Meister',
    description: 'Find your Meister wetsuit or fins with a few simple questions about how you dive. Practical guidance in English and Greek.',
    path: '/gear-finder', locale: await getLocale(),
  })
}
export default async function GearFinderPage() {
  const catalogue = await loadGearCatalogue(await getLocale())
  return <><Navbar /><main><GearFinder catalogue={catalogue} /></main><Footer /></>
}
