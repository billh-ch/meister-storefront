# Component Patterns

## Categories Section Details

The main showcase section (`categories-section.tsx`) with:
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
