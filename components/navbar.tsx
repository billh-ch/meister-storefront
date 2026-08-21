'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { formatPrice } from '@/lib/mock-data'
import type { SearchSuggestion } from '@/app/api/search-suggestions/route'

const SUGGESTION_DEBOUNCE_MS = 250
const SUGGESTION_MIN_LENGTH = 2

const NAV_LINKS = [
  { label: 'FINS', href: '/fins' },
  { label: 'SUITS', href: '/suits' },
  { label: 'GUNS', href: '/guns' },
  { label: 'ACCESSORIES', href: '/accessories' },
  { label: 'MERCH', href: '/merch' },
] as const

/** Sticky navigation bar with logo, nav links, search, and cart/account icons. */
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const abortRef = useRef<AbortController | undefined>(undefined)

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  // Clear any pending debounce/fetch on unmount so a slow response can't
  // try to set state on an unmounted component.
  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [])

  const closeSearch = () => {
    setSearchOpen(false)
    setQuery('')
    setSuggestions([])
    clearTimeout(debounceRef.current)
    abortRef.current?.abort()
  }

  const handleQueryChange = (value: string) => {
    setQuery(value)
    clearTimeout(debounceRef.current)

    const trimmed = value.trim()
    if (trimmed.length < SUGGESTION_MIN_LENGTH) {
      setSuggestions([])
      return
    }

    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      fetch(`/api/search-suggestions?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data: { results: SearchSuggestion[] }) => setSuggestions(data.results))
        .catch(() => {
          // A stale/aborted request is expected whenever the user keeps
          // typing — this is a lightweight preview, not worth surfacing
          // an error state for.
        })
    }, SUGGESTION_DEBOUNCE_MS)
  }

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{ backgroundColor: '#111111' }}
    >
      <nav
        className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex-shrink-0"
          aria-label="Meister — home"
        >
          <Image
            src="/meister-logo.svg"
            alt="Meister"
            width={140}
            height={40}
            priority
          />
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden items-center gap-8 md:flex" role="list">
          {NAV_LINKS.map(({ label, href }) => (
            <li key={label}>
              <Link
                href={href}
                className="text-sm font-bold tracking-wider text-white transition-colors duration-150 hover:text-[#FFD700]"
                style={{ fontFamily: 'var(--font-space-mono), monospace' }}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right actions */}
        <div className="flex items-center gap-4">
          {/* Search toggle */}
          <button
            type="button"
            className="text-white transition-colors hover:text-[#FFD700]"
            onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
            aria-expanded={searchOpen}
            aria-controls="search-bar"
            aria-label={searchOpen ? 'Close search' : 'Search products'}
          >
            {searchOpen ? <CloseIcon /> : <SearchIcon />}
          </button>

          {/* Cart icon */}
          <Link
            href="/cart"
            aria-label="Shopping cart"
            className="text-white transition-colors hover:text-[#FFD700]"
          >
            <CartIcon />
          </Link>

          {/* Account icon */}
          <Link
            href="/account"
            aria-label="My account"
            className="text-white transition-colors hover:text-[#FFD700]"
          >
            <AccountIcon />
          </Link>

          {/* Mobile menu button */}
          <button
            className="text-white transition-colors hover:text-[#FFD700] md:hidden"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>
      </nav>

      {/* Search bar — plain GET form, works with zero client JS beyond
          toggling visibility; the browser navigates straight to
          /search?q=... on submit, same "URL is the source of truth"
          pattern as sort/pagination on the collection pages. */}
      {searchOpen && (
        <div
          id="search-bar"
          className="border-t border-[#222222] px-6 py-4"
          style={{ backgroundColor: '#111111' }}
        >
          <div className="relative mx-auto max-w-[1400px]">
            <form action="/search" method="GET" className="flex items-center gap-3">
              <label htmlFor="navbar-search-input" className="sr-only">
                Search products
              </label>
              <input
                ref={searchInputRef}
                id="navbar-search-input"
                type="text"
                name="q"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                autoComplete="off"
                placeholder="Search products…"
                className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder-[#666666] outline-none"
                style={{
                  border: '1px solid #444444',
                  fontFamily: 'var(--font-space-mono), monospace',
                }}
              />
              <button
                type="submit"
                className="btn-gold shrink-0 px-5 py-2 text-xs tracking-[0.1em] uppercase"
                style={{ fontFamily: 'var(--font-space-mono), monospace' }}
              >
                GO
              </button>
            </form>

            {/* Live preview — up to 2 best matches while typing. Enter/GO
                still does a full /search regardless of this; it's a
                pure add-on, not a replacement. */}
            {suggestions.length > 0 && (
              <div
                className="absolute top-full right-0 left-0 z-10 mt-2"
                style={{ backgroundColor: '#1B1B18', border: '1px solid #444444' }}
              >
                {suggestions.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    onClick={closeSearch}
                    className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-[#222222]"
                  >
                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden bg-[#222222]">
                      {product.image && (
                        <Image src={product.image} alt="" fill className="object-cover" sizes="40px" />
                      )}
                    </div>
                    <span
                      className="truncate text-sm text-white"
                      style={{ fontFamily: 'var(--font-space-mono), monospace' }}
                    >
                      {product.name}
                    </span>
                    <span
                      className="ml-auto shrink-0 text-sm text-[#999999]"
                      style={{ fontFamily: 'var(--font-space-mono), monospace' }}
                    >
                      {product.priceFrom ? `From ${formatPrice(product.price)}` : formatPrice(product.price)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="border-t border-[#222222] md:hidden"
          style={{ backgroundColor: '#111111' }}
        >
          <ul className="flex flex-col px-6 py-4" role="list">
            {NAV_LINKS.map(({ label, href }) => (
              <li key={label}>
                <Link
                  href={href}
                  className="block py-3 text-sm font-bold tracking-wider text-white hover:text-[#FFD700]"
                  style={{ fontFamily: 'var(--font-space-mono), monospace' }}
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  )
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" x2="16.65" y1="21" y2="16.65" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <line x1="3" x2="21" y1="6" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function AccountIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <line x1="4" x2="20" y1="7" y2="7" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="17" y2="17" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <line x1="18" x2="6" y1="6" y2="18" />
      <line x1="6" x2="18" y1="6" y2="18" />
    </svg>
  )
}
