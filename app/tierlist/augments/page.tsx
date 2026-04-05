'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ALL_AUGMENTS } from '@/app/builder/builder-data';
import { SpriteIcon } from '@/components/ui/sprite-icon';

const TABS = [
  { label: 'Comps', href: '/tierlist/comps', active: false },
  { label: 'Items', href: '/tierlist/items', active: false },
  { label: 'Augments', href: '/tierlist/augments', active: true },
];

const RARITY_COLORS: Record<string, string> = {
  Silver: '#9ca3af', Gold: '#fbbf24', Prismatic: '#c084fc',
};

const TIER_CONFIG = {
  S: { label: 'S TIER', color: '#ff2244', bgClass: 'tier-s', textColor: 'text-[#ff2244]' },
  A: { label: 'A TIER', color: '#FF7A00', bgClass: 'tier-a', textColor: 'text-[#FF7A00]' },
  B: { label: 'B TIER', color: '#fbbf24', bgClass: 'tier-b', textColor: 'text-[#fbbf24]' },
  C: { label: 'C TIER', color: '#39FF14', bgClass: 'tier-c', textColor: 'text-[#39FF14]' },
};

const tiers: ('S'|'A'|'B'|'C')[] = ['S', 'A', 'B', 'C'];

// Deterministic tier based on ID for visual demonstration
function getTier(id: string): 'S'|'A'|'B'|'C' {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return tiers[hash % 4];
}

export default function AugmentsTierlistPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [rarityFilter, setRarityFilter] = useState<'Silver'|'Gold'|'Prismatic'>('Silver');

  const filteredAugments = ALL_AUGMENTS.filter(aug =>
    aug.rarity === rarityFilter &&
    aug.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs text-[var(--color-text-muted)] px-2 py-0.5 rounded bg-[var(--color-grimoire)] border border-[var(--color-border)]">
                Patch 16.7.1
              </span>
            </div>
            <h1
              className="text-3xl sm:text-4xl font-extrabold flex items-center gap-3"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              <span className="text-3xl">🃏</span>
              AUGMENTS <span className="text-[var(--color-pumpkin)]">▸</span>{' '}
              <span className="gradient-text">TIERLIST</span>
            </h1>
          </div>
          
          {/* Controls: Search + Rarity Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </span>
              <input
                type="text"
                placeholder="Search augments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-full bg-[var(--color-grimoire-light)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-amethyst)] transition-colors w-56"
              />
            </div>
            
            <div className="flex items-center gap-1 bg-[var(--color-grimoire-light)] p-1 rounded-full border border-[var(--color-border)]">
              {(['Silver', 'Gold', 'Prismatic'] as const).map(rarity => (
                <button
                  key={rarity}
                  onClick={() => setRarityFilter(rarity)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${
                    rarityFilter === rarity 
                      ? 'bg-[var(--color-pumpkin)] text-black' 
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/[0.05]'
                  }`}
                >
                  {rarity}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-[var(--color-border)]">
          {TABS.map(tab => (
            <Link
              key={tab.label}
              href={tab.href}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab.active
                  ? 'border-[var(--color-pumpkin)] text-[var(--color-pumpkin)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Tier Rows */}
        <div className="space-y-4">
          {tiers.map((tier, tierIdx) => {
            const tierAugs = filteredAugments.filter(a => getTier(a.id) === tier);
            const cfg = TIER_CONFIG[tier];

            if (tierAugs.length === 0) return null;

            return (
              <motion.div
                key={tier}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: tierIdx * 0.1 }}
                className={`flex items-stretch gap-4 rounded-xl border ${cfg.bgClass} overflow-hidden bg-[var(--color-grimoire)]/40 backdrop-blur-sm`}
              >
                {/* Tier label */}
                <div
                  className="flex-shrink-0 w-16 lg:w-20 flex flex-col items-center justify-center py-4"
                  style={{ borderRight: `1px solid ${cfg.color}30`, backgroundColor: `${cfg.color}15` }}
                >
                  <span
                    className={`text-3xl font-black ${cfg.textColor}`}
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    {tier}
                  </span>
                  <span className={`text-[9px] font-bold ${cfg.textColor} opacity-80 mt-1`}>
                    {cfg.label}
                  </span>
                </div>

                {/* Augments */}
                <div className="flex-1 flex flex-wrap content-start gap-x-5 gap-y-4 py-4 px-2">
                  {tierAugs.map(aug => (
                    <div
                      key={aug.id}
                      className="group flex flex-col items-center w-16 md:w-20 cursor-pointer transition-transform duration-200 hover:scale-110"
                      title={aug.desc ? aug.desc.replace(/<[^>]+>/g, '') : aug.name}
                    >
                      <div className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center drop-shadow-lg mb-1 relative">
                        <SpriteIcon type="augment" id={aug.id} className="w-full h-full object-contain pointer-events-none" alt={aug.name} scale={1} />
                      </div>
                      <span className="text-[9px] md:text-[10px] font-semibold text-center text-[var(--color-text-primary)] group-hover:text-[var(--color-pumpkin)] transition-colors leading-tight break-words max-w-full">
                        {aug.name}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

