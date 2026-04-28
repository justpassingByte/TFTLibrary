'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, ChevronDown, Lock, Menu, X } from 'lucide-react';

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
    <header className="game-header fixed left-0 right-0 top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[68px] items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="game-logo-mark">
              <BookOpen size={19} strokeWidth={1.9} />
            </span>
            <span className="game-logo-text">
              <span className="gradient-text">TFT</span>
              <span>Grimoire</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => item.children && setOpenDropdown(item.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <Link href={item.href} className="game-nav-link">
                  {item.label}
                  {item.children && <ChevronDown size={13} strokeWidth={1.8} className="text-[var(--color-pumpkin)]/80" />}
                </Link>

                <AnimatePresence>
                  {item.children && openDropdown === item.label && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                      className="arcane-surface absolute left-0 top-full mt-2 w-48 overflow-hidden"
                    >
                      {item.children.map((child) => (
                        <Link
                          key={child.label}
                          href={child.href}
                          className="block px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[rgba(250,204,21,0.055)] hover:text-[var(--color-pumpkin)]"
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

          <div className="hidden items-center gap-3 md:flex">
            <span className="game-patch-pill rounded-md px-3 py-1.5 text-xs font-semibold">
              Patch 16.8
            </span>
            <Link
              href="/pricing"
              className="arcane-primary rounded-md px-6 py-2.5 text-xs font-black uppercase tracking-[0.08em] transition hover:-translate-y-0.5 hover:brightness-105"
            >
              Join Coven
            </Link>
            <Link href="/login" id="header-admin-login" className="game-user-button" aria-label="Admin login">
              <Lock size={17} strokeWidth={1.8} />
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="grid h-10 w-10 place-items-center rounded-md text-[var(--color-text-secondary)] transition hover:bg-white/5 hover:text-white md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} strokeWidth={1.8} /> : <Menu size={24} strokeWidth={1.8} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-[rgba(212,175,55,0.16)] bg-[rgba(3,5,11,0.96)]"
          >
            <div className="space-y-2 px-4 py-4">
              {NAV_ITEMS.map((item) => (
                <div key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-md px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white"
                  >
                    {item.label}
                  </Link>
                  {item.children?.map((child) => (
                    <Link
                      key={child.label}
                      href={child.href}
                      onClick={() => setMobileOpen(false)}
                      className="block px-7 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-pumpkin)]"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ))}
              <Link
                href="/pricing"
                onClick={() => setMobileOpen(false)}
                className="arcane-primary block rounded-md px-3 py-2 text-center text-sm font-bold uppercase tracking-[0.08em]"
              >
                Join Coven
              </Link>
              <Link
                href="/login"
                id="mobile-admin-login"
                onClick={() => setMobileOpen(false)}
                className="block rounded-md border border-[var(--color-border)] px-3 py-2 text-center text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-white/5 hover:text-white"
              >
                Admin Login
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
