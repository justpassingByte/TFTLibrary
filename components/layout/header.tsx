'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  {
    label: 'Tierlists',
    href: '/tierlist/comps',
    children: [
      { label: 'Comps', href: '/tierlist/comps' },
      { label: 'Items', href: '/tierlist/items' },
      { label: 'Augments', href: '/tierlist/augments' },
    ],
  },
  {
    label: 'Tools',
    href: '/builder',
    children: [
      { label: 'Team Builder', href: '/builder' },
      { label: 'Tierlist Maker', href: '/tierlist-maker' },
    ],
  },
  {
    label: 'Meta',
    href: '/meta',
    children: [
      { label: 'Meta Oracle', href: '/meta' },
      { label: 'Patch Notes', href: '/patch-notes' },
    ],
  },
  { label: 'Study Hall', href: '/studyhall' },
  { label: 'Pricing', href: '/pricing' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl">📖</span>
            <span
              className="text-xl font-bold tracking-wide"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              <span className="gradient-text">TFT</span>
              <span className="text-[var(--color-text-primary)]">Grimoire</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => item.children && setOpenDropdown(item.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <Link
                  href={item.href}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-all duration-200 flex items-center gap-1"
                >
                  {item.label}
                  {item.children && (
                    <svg className="w-3.5 h-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </Link>

                {/* Dropdown */}
                <AnimatePresence>
                  {item.children && openDropdown === item.label && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-1 w-48 glass-strong rounded-xl overflow-hidden shadow-xl shadow-black/40"
                    >
                      {item.children.map(child => (
                        <Link
                          key={child.label}
                          href={child.href}
                          className="block px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-pumpkin)] hover:bg-white/5 transition-colors"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-xs text-[var(--color-text-muted)] font-medium px-2 py-1 rounded-md bg-[var(--color-grimoire)] border border-[var(--color-border)]">
              Patch 16.8
            </span>
            <Link
              href="/pricing"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--color-pumpkin)] text-black hover:opacity-90 transition-opacity"
            >
              Join Coven
            </Link>
            <Link
              href="/login"
              id="header-admin-login"
              title="Admin login"
              className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/5 transition-all duration-200"
              aria-label="Admin login"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-[var(--color-text-secondary)]"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden glass-strong border-t border-[var(--color-border)] overflow-hidden"
          >
            <div className="px-4 py-4 space-y-2">
              {NAV_ITEMS.map(item => (
                <div key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5"
                  >
                    {item.label}
                  </Link>
                  {item.children?.map(child => (
                    <Link
                      key={child.label}
                      href={child.href}
                      onClick={() => setMobileOpen(false)}
                      className="block pl-8 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-pumpkin)]"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ))}
              <Link
                href="/pricing"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-center bg-[var(--color-pumpkin)] text-black"
              >
                Join Coven
              </Link>
              <Link
                href="/login"
                id="mobile-admin-login"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-white/5 transition-colors"
              >
                🔒 Admin Login
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
