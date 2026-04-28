import Link from 'next/link';

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-[var(--color-border)] bg-[rgba(5,8,18,0.92)]">
      <div className="arcane-glyph-layer opacity-[0.035]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📖</span>
              <span
                className="text-lg font-bold"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                <span className="gradient-text">TFT</span>Grimoire
              </span>
            </Link>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
              The arcane source for TFT meta intelligence. Curated comps, real-time trends, and strategic tools for every summoner.
            </p>
          </div>

          {/* Tierlists */}
          <div>
            <h3
              className="text-sm font-semibold text-[var(--color-pumpkin)] mb-3 uppercase tracking-wider"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Tierlists
            </h3>
            <ul className="space-y-2">
              {['Comps', 'Items', 'Augments'].map(item => (
                <li key={item}>
                  <Link
                    href={`/tierlist/${item.toLowerCase()}`}
                    className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tools */}
          <div>
            <h3
              className="text-sm font-semibold text-[var(--color-pumpkin)] mb-3 uppercase tracking-wider"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Tools
            </h3>
            <ul className="space-y-2">
              {[
                { label: 'Meta Oracle', href: '/meta' },
                { label: 'Study Hall', href: '/studyhall' },
                { label: 'Pricing', href: '/pricing' },
              ].map(item => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3
              className="text-sm font-semibold text-[var(--color-pumpkin)] mb-3 uppercase tracking-wider"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Community
            </h3>
            <ul className="space-y-2">
              {['Discord', 'Twitter / X', 'YouTube'].map(item => (
                <li key={item}>
                  <span className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--color-text-muted)]">
            © 2026 TFT Grimoire. Not endorsed by Riot Games.
          </p>
          <div className="flex gap-4">
            <Link href="#" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">Privacy</Link>
            <Link href="#" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">Terms</Link>
            <Link href="#" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">About</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
