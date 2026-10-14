import { getTranslator } from '@/lib/i18n/server'
import Image from 'next/image'
import Link from '@/components/i18n/localized-link'

/** Brand story and community photograph from https://meister.gr/about-us. */
export default async function AboutSection() {
  const t = await getTranslator()

  return (
    <section aria-labelledby="homepage-about-heading" className="bg-dark px-6 py-12 md:px-10 md:py-16">
      <div className="mx-auto grid max-w-[1200px] gap-8 border-t border-white/20 pt-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:items-center md:gap-12">
        <figure className="mx-auto w-full max-w-[420px] md:mx-0">
          <div className="relative aspect-square overflow-hidden border border-white/20">
            <Image
              src="/images/meister-about-community.jpg"
              alt={t("Meister community members holding a branded banner beside the sea")}
              fill
              sizes="(max-width: 467px) calc(100vw - 48px), 420px"
              className="object-cover"
            />
          </div>
          <figcaption className="mt-3 text-xs tracking-wider text-gold">{t("#WeAreFamily")}</figcaption>
        </figure>

        <div className="min-w-0">
          <p className="mb-4 text-xs tracking-[0.15em] text-gold uppercase">{t("About us")}</p>
          <h2 id="homepage-about-heading" className="font-display text-3xl leading-[1.15] font-extrabold text-white sm:text-4xl lg:text-5xl">
            <span className="block">{t("MEISTER.")}</span>
            <span className="block">{t("SINCE")}{' '}<span className="text-gold">2013.</span></span>
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-[#cccccc]">
            {t("Founded in Greece in 2013, Meister creates wetsuits, fin blades and diving accessories for freedivers and spearfishers. Our work brings together equipment design, practical experience and a community connected by the sea. From our base in Aigaleo, Athens, we help divers find the equipment and guidance for their next underwater adventure.")}
          </p>
          <Link href="/about" className="btn-gold mt-6 inline-flex min-h-11 items-center justify-center gap-4 px-5 py-3 text-xs tracking-[0.1em] uppercase">
            {t("About Meister")}
<span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
