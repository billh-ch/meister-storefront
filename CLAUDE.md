@AGENTS.md

# Meister & Meister Dive — Storefront

Headless BigCommerce diving equipment e-commerce site. All product data is currently mock; will connect to BigCommerce Catalyst GraphQL API.

## Tech Stack

- **Framework**: Next.js 16.2 (App Router, Turbopack)
- **React**: 19.2
- **Styling**: Tailwind CSS v4 (`@theme` directive, CSS-based config in `globals.css`)
- **Carousel**: `embla-carousel-react` v8
- **Package manager**: pnpm
- **Deployment**: GitHub → `billh-ch/meister-storefront` (public)

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| Gold | `#FFD700` | Accent, buttons, borders, active states |
| Dark | `#1B1B18` | Background |
| Card border | `#222222` | Card/panel borders |
| Nav | `#111111` | Navbar background |
| Font display | Dela Gothic One (`--font-dela-gothic`) | Headings |
| Font body | Space Mono (`--font-space-mono`) | Body text, UI |

CSS utilities: `.btn-gold`, `.hatching-bg`, `.animate-marquee`, `.category-image`, `.accordion-content`, `.accordion-chevron`

## Project Structure

```
app/
├── globals.css        # Tailwind v4 config + design tokens + animations
├── layout.tsx         # Root layout, Google Fonts (Dela Gothic One, Space Mono, Anton)
└── page.tsx           # Homepage — assembles all sections (Server Component)
components/
├── navbar.tsx         # Sticky nav, mobile hamburger ("use client")
├── hero-section.tsx   # 100vh hero, "Go Deep. / Go Meister." + navy gradient circle
├── product-carousel.tsx # "MOST WANTED" Embla carousel + VIEW ALL button
├── product-card.tsx   # Single product card with swatches
├── categories-section.tsx # Tabbed category showcase (browser-tab style, crossfading images, hover accordions, marquee ticker, filtered product carousel)
├── merch-section.tsx  # Merch banner with marquee ticker + CTA
├── testimonials-section.tsx # Customer reviews
├── newsletter-section.tsx   # Email signup
└── footer.tsx         # Site footer with links
lib/
├── mock-data.ts       # All interfaces (Product, CategoryDetail, Testimonial, Category) + mock data + formatPrice()
```

## Homepage Section Order

1. Navbar
2. HeroSection (100vh)
3. ProductCarousel ("MOST WANTED")
4. CategoriesSection (tabbed showcase: Fins / Suits / Accessories / Merch)
5. MerchSection
6. TestimonialsSection
7. NewsletterSection
8. Footer

## Categories Section Details

The main showcase section with:
- **Browser-tab style tabs** — centered, boxed, active tab is white
- **Split layout** — left 50% crossfading image (1px gold border), right 50% content (1px gold border)
- **Marquee ticker** — per-category scrolling text (e.g., "Meister Carbon Diving Fins")
- **Hover accordions** — expand on mouseenter, collapse on mouseleave, also clickable
- **Filtered product carousel** — shows products from active category tab with VIEW ALL button
- Data: `categoryDetails` in mock-data.ts has `marqueeText`, `tagline`, `accordionItems` per category

## Key Patterns

- `data-active="true"` / `data-open="true"` for CSS-driven animations (must be explicit strings, not booleans)
- `document.fonts.ready` for recalculating layout after font load
- `emblaApi.reInit()` + `scrollTo(0, true)` when filtered data changes
- CSS `grid-template-rows: 0fr → 1fr` for smooth accordion height animation
- Marquee: two identical halves so `-50%` translateX loops seamlessly

## Conventions

- Always commit and push changes to GitHub after making them
- Fonts set via CSS variables: `var(--font-dela-gothic)`, `var(--font-space-mono)`
- Colors as inline styles or Tailwind tokens — no hardcoded values outside globals.css
- Images from Unsplash (hostname configured in `next.config.ts`)
- `formatPrice()` uses `el-GR` locale, EUR currency
