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
      <div className="relative z-10 flex flex-col items-center gap-8 text-center">
        <h1
          className="text-5xl leading-[1.1] text-white md:text-7xl lg:text-8xl xl:text-9xl"
          style={{ fontFamily: 'var(--font-dela-gothic), sans-serif' }}
        >
          Go Deep.
          <br />
          Go Meister.
        </h1>

        <p
          className="max-w-xl text-sm text-[#999999] md:text-base"
          style={{ fontFamily: 'var(--font-space-mono), monospace' }}
        >
          Premium diving equipment. Athens, Greece.
        </p>

        <Link
          href="/shop"
          className="btn-gold inline-block px-10 py-4 text-sm tracking-[0.15em] uppercase"
          aria-label="Shop Meister diving equipment"
        >
          SHOP NOW
        </Link>
      </div>

      {/* Bottom gradient fade */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: 'linear-gradient(to bottom, transparent, #1B1B18)',
          zIndex: 1,
        }}
        aria-hidden="true"
      />
    </section>
  )
}
