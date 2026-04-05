'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ITEMS } from '@/app/builder/builder-data';
import { SpriteIcon } from '@/components/ui/sprite-icon';

const TABS = [
  { label: 'Comps', href: '/tierlist/comps', active: false },
  { label: 'Items', href: '/tierlist/items', active: true },
  { label: 'Augments', href: '/tierlist/augments', active: false },
];

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

export default function ItemsTierlistPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = ITEMS.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
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
              <span className="text-3xl">⚗️</span>
              ITEMS <span className="text-[var(--color-pumpkin)]">▸</span>{' '}
              <span className="gradient-text">TIERLIST</span>
            </h1>
          </div>
          {/* Search */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 rounded-xl bg-[var(--color-grimoire)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-amethyst)] transition-colors w-48"
            />
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
            const tierItems = filteredItems.filter(i => getTier(i.id) === tier);
            const cfg = TIER_CONFIG[tier];

            if (tierItems.length === 0) return null;

            return (
              <motion.div
                key={tier}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: tierIdx * 0.1 }}
                className={`flex items-stretch gap-4 rounded-xl border ${cfg.bgClass} overflow-hidden`}
              >
                {/* Tier label */}
                <div
                  className="flex-shrink-0 w-20 flex flex-col items-center justify-center py-4"
                  style={{ borderRight: `1px solid ${cfg.color}30` }}
                >
                  <span
                    className={`text-3xl font-black ${cfg.textColor}`}
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    {tier}
                  </span>
                  <span className={`text-[9px] font-bold ${cfg.textColor} opacity-70`}>
                    {cfg.label}
                  </span>
                </div>

                {/* Items */}
                <div className="flex-1 flex items-center gap-3 py-3 px-2 flex-wrap">
                  {tierItems.map(item => (
                    <div
                      key={item.id}
                      className="group relative flex flex-col items-center gap-1 cursor-pointer transition-all duration-200 hover:scale-110"
                      title={item.name}
                    >
                      <div className="w-10 h-10 rounded-lg shrink-0 border border-[var(--color-border)] overflow-hidden bg-[var(--color-grimoire-light)] p-0.5" style={{ borderColor: cfg.color }}>
                        <SpriteIcon type="item" id={item.id} className="w-full h-full pointer-events-none" alt={item.name} scale={1} />
                      </div>
                      <span className="text-[9px] text-[var(--color-text-muted)] text-center max-w-[48px] truncate group-hover:text-[var(--color-text-primary)] transition-colors">
                        {item.name}
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
