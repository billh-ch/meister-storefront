import Link from 'next/link'

export default function HeroSection() {
  return (
    <section
      className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden px-6"
      style={{
        backgroundColor: '#1B1B18',
        backgroundImage: 'url(/images/hero-sectio-image.JPEG)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      aria-label="Hero — Meister diving equipment"
    >
      {/* Dark overlay for text readability */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        <h1
          className="text-3xl leading-[1.15] text-white md:text-4xl lg:text-5xl xl:text-6xl"
          style={{ fontFamily: 'var(--font-dela-gothic), sans-serif', fontWeight: 800 }}
        >
          Go Deep.
          <br />
          Go Meister.
        </h1>

        <Link
          href="/shop"
          className="btn-gold inline-block px-6 py-2.5 text-sm tracking-[0.15em] uppercase"
          aria-label="Shop Meister diving equipment"
        >
          SHOP NOW
        </Link>
      </div>

    </section>
  )
}
