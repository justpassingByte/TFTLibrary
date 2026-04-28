'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const FEATURES = [
  {
    title: 'Comp Tierlists',
    desc: 'Curated S-X tier comps updated every patch. Know the meta before your opponents.',
    icon: '📜',
    href: '/tierlist/comps',
    accent: '#FACC15',
  },
  {
    title: 'Meta Oracle',
    desc: 'Real-time meta shift tracking with sparklines. See what\'s rising and falling.',
    icon: '🔮',
    href: '/meta',
    accent: '#C7B58A',
  },
  {
    title: 'Smart Recommendations',
    desc: 'Select your items & augments. Get instant comp recommendations backed by data.',
    icon: '🧠',
    href: '/meta',
    accent: '#9FB7A1',
  },
  {
    title: 'Item Tierlists',
    desc: 'Every component and completed item ranked by win rate and avg placement.',
    icon: '⚗️',
    href: '/tierlist/items',
    accent: '#8B6F2A',
  },
  {
    title: 'Augment Tierlists',
    desc: 'Silver, Gold, and Prismatic augments sorted by real performance data.',
    icon: '🃏',
    href: '/tierlist/augments',
    accent: '#B99A66',
  },
  {
    title: 'Study Hall',
    desc: 'Deep-dive strategy guides written by high-elo players. Learn the dark arts.',
    icon: '📚',
    href: '/studyhall',
    accent: '#8FA7C2',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.07),transparent_62%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(250,204,21,0.18)] to-transparent" />
          {/* Floating runes */}
          {['✦', '⚝', '✧', '◇', '⬡', '☽'].map((rune, i) => (
            <motion.div
              key={i}
              className="absolute text-[var(--color-pumpkin)] opacity-[0.08]"
              style={{
                top: `${15 + i * 12}%`,
                left: `${5 + i * 16}%`,
                fontSize: `${18 + i * 4}px`,
              }}
              animate={{
                y: [-10, 10, -10],
                rotate: [0, 360],
              }}
              transition={{
                duration: 8 + i * 2,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              {rune}
            </motion.div>
          ))}
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Patch badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--color-necrotic)] animate-pulse" />
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              Patch 16.8 — Updated 2 hours ago
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-tight mb-6"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            The Arcane Source for{' '}
            <span className="gradient-text">TFT Comps</span>
            <br />
            <span className="text-[var(--color-text-secondary)]">&</span>{' '}
            <span className="gradient-text-spectral">Strategy</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg text-[var(--color-text-secondary)] mb-10 leading-relaxed"
          >
            Master the meta with curated tier lists, real-time trend tracking,
            smart comp recommendations, and deep-dive strategy guides.
            Your grimoire for climbing ranked.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/tierlist/comps"
              className="px-8 py-3.5 rounded-lg text-base font-semibold arcane-primary hover:brightness-105 transition-all duration-200"
            >
              View Tier Lists
            </Link>
            <Link
              href="/meta"
              className="px-8 py-3.5 rounded-lg text-base font-semibold arcane-secondary transition-all duration-200"
            >
              🔮 Meta Oracle
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2
              className="text-3xl sm:text-4xl font-bold mb-3"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              <span className="gradient-text">Your Arsenal</span> of Tools
            </h2>
            <p className="text-[var(--color-text-secondary)] max-w-xl mx-auto">
              Everything a TFT player needs to dominate the ladder. All in one grimoire.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  href={feat.href}
                  className="grimoire-card p-6 block group hover-float h-full"
                >
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl mb-4 border transition-all"
                    style={{
                      color: feat.accent,
                      borderColor: `${feat.accent}44`,
                      background: `linear-gradient(180deg, ${feat.accent}18, rgba(18,26,43,0.72))`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 0 18px ${feat.accent}14`,
                    }}
                  >
                    {feat.icon}
                  </div>
                  <h3
                    className="text-lg font-semibold mb-2 text-[var(--color-text-primary)] group-hover:text-[var(--color-pumpkin)] transition-colors"
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    {feat.title}
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    {feat.desc}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Subscription CTA */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--color-pumpkin)]/5 to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2
              className="text-3xl sm:text-4xl font-bold mb-4"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Join the <span className="gradient-text">Coven</span>
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-8 max-w-xl mx-auto text-lg">
              Unlock Meta Oracle, Smart Recommendations, ad-free experience, and premium tools. Plans start at
              <span className="text-[var(--color-pumpkin)] font-bold"> $5.99/mo</span>.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/pricing"
                  className="px-8 py-3.5 rounded-lg text-base font-semibold arcane-primary hover:brightness-105 transition-all"
              >
                View Plans
              </Link>
              <Link
                href="/pricing"
                className="px-8 py-3.5 rounded-lg text-base font-semibold arcane-secondary transition-all"
              >
                Compare Features
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-12 border-y border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {[
              { value: '11', label: 'Curated Comps' },
              { value: '14', label: 'Items Ranked' },
              { value: '12', label: 'Augments Analyzed' },
              { value: '16.8', label: 'Current Patch' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div
                  className="text-3xl font-bold gradient-text mb-1"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  {stat.value}
                </div>
                <div className="text-sm text-[var(--color-text-muted)]">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
