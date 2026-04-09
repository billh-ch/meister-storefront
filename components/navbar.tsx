'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

const NAV_LINKS = [
  { label: 'FINS', href: '/fins' },
  { label: 'GUNS', href: '/guns' },
  { label: 'ACCESSORIES', href: '/accessories' },
  { label: 'MERCH', href: '/merch' },
] as const

/** Sticky navigation bar with logo, nav links, and cart/account icons. */
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

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
