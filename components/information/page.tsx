import Link from 'next/link'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import type { InformationPage } from '@/lib/agents/content'

export default function InformationContent({ page }: { page: InformationPage }) {
  return <main style={{ backgroundColor: '#1B1B18' }}>
    <Navbar />
    <article className="mx-auto max-w-4xl px-6 py-16 text-white md:px-10">
      <h1 className="mb-10 text-3xl md:text-5xl" style={{ fontFamily: 'var(--font-dela-gothic), sans-serif' }}>{page.title}</h1>
      {page.sections.map(section => <section key={section.heading} className="mb-10">
        <h2 className="mb-4 text-xl md:text-2xl">{section.heading}</h2>
        {section.paragraphs.map(paragraph => <p key={paragraph} className="mb-4 text-sm leading-7" style={{ fontFamily: 'var(--font-space-mono), monospace' }}>{paragraph}</p>)}
      </section>)}
      <nav aria-label="Store information" className="flex flex-wrap gap-5 text-sm underline">
        {['/about','/contact','/privacy','/docs','/docs/agents','/docs/mcp','/docs/auth','/llms.txt','/sitemap.xml'].map(path => <Link key={path} href={path}>{path}</Link>)}
      </nav>
    </article>
    <Footer />
  </main>
}
