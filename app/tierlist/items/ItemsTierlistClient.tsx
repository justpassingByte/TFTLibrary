'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

import { getItemImageUrl } from '@/lib/riot-cdn';

const TABS = [
  { label: 'Comps', href: '/tierlist/comps', active: false },
  { label: 'Items', href: '/tierlist/items', active: true },
  { label: 'Augments', href: '/tierlist/augments', active: false },
];

const TIER_CONFIG = {
  S: { color: '#ff2244', bg: 'rgba(255,34,68,0.08)', glow: 'rgba(255,34,68,0.25)' },
  A: { color: '#FF7A00', bg: 'rgba(255,122,0,0.08)', glow: 'rgba(255,122,0,0.25)' },
  B: { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', glow: 'rgba(251,191,36,0.2)' },
  C: { color: '#39FF14', bg: 'rgba(57,255,20,0.08)', glow: 'rgba(57,255,20,0.2)' },
  D: { color: '#9A9A9A', bg: 'rgba(154,154,154,0.08)', glow: 'rgba(154,154,154,0.15)' },
};

type Tier = keyof typeof TIER_CONFIG;
const tiers: Tier[] = ['S', 'A', 'B', 'C', 'D'];

interface ItemMeta {
  id: string;
  name: string;
  icon: string | null;
  tier: string;
  category: string;
  avg_placement: number | null;
  top4_rate: number | null;
  usage_count: number | null;
}

const CATEGORIES = ['Craftable', 'Artifact', 'Radiant', 'Support'];

export function ItemsTierlistClient({ items }: { items: ItemMeta[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Craftable');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    item.category === categoryFilter
  );

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-2">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs text-[var(--color-text-muted)] px-2 py-0.5 rounded bg-[var(--color-grimoire)] border border-[var(--color-border)]">Patch 16.8</span>
              <span className="text-xs text-[var(--color-necrotic)]">Admin Curated</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold flex items-center gap-3" style={{ fontFamily: "'Cinzel', serif" }}>
              <span className="text-3xl">⚗️</span>
              ITEMS <span className="text-[var(--color-pumpkin)]">▸</span>{' '}
              <span className="gradient-text">TIERLIST</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input type="text" placeholder="Search items..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 rounded-xl bg-[var(--color-grimoire)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-amethyst)] transition-colors w-48" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--color-border)] overflow-x-auto no-scrollbar">
          {TABS.map(tab => (
            <Link key={tab.label} href={tab.href}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab.active ? 'border-[var(--color-pumpkin)] text-[var(--color-pumpkin)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`}>
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 mb-6 mt-6 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors border ${
                categoryFilter === cat 
                  ? 'bg-[var(--color-pumpkin)] text-black border-[var(--color-pumpkin)]' 
                  : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-white hover:border-gray-500'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Tier Rows */}
        <div className="space-y-5">
          {tiers.map((tier, tierIdx) => {
            const tierItems = filteredItems.filter(i => i.tier === tier);
            const cfg = TIER_CONFIG[tier];

            return (
              <motion.div key={tier} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: tierIdx * 0.08 }} className="itl-tier-row" style={{ borderColor: `${cfg.color}40`, background: cfg.bg }}>

                {/* Tier label */}
                <div className="itl-tier-label" style={{ borderColor: `${cfg.color}30`, background: `${cfg.color}12` }}>
                  <span className="itl-tier-letter" style={{ color: cfg.color }}>{tier}</span>
                  <span className="itl-tier-sub" style={{ color: cfg.color }}>TIER</span>
                  <span className="itl-tier-count">{tierItems.length}</span>
                </div>

                {/* Items */}
                <div className="itl-item-grid">
                  {tierItems.length === 0 ? (
                    <div className="itl-empty">No items in this tier</div>
                  ) : (
                    tierItems.map(item => (
                      <div key={item.id} className="itl-item" onMouseEnter={() => setHoveredItem(item.id)}
                        onMouseLeave={() => setHoveredItem(null)}>
                        <div className="itl-item-img" style={{ borderColor: `${cfg.color}60`, boxShadow: hoveredItem === item.id ? `0 0 16px ${cfg.glow}` : 'none' }}>
                          {item.icon ? (
                            <img src={getItemImageUrl(item.icon || item.id)} alt={item.name} className="w-full h-full object-contain pointer-events-none" loading="lazy" crossOrigin="anonymous" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-[var(--color-text-muted)]">?</div>
                          )}
                        </div>
                        <span className="itl-item-name">{item.name}</span>

                        {/* Tooltip */}
                        <AnimatePresence>
                          {hoveredItem === item.id && (
                            <motion.div className="itl-tooltip" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.12 }}>
                              <div className="itl-tt-header">
                                {getItemImageUrl(item.icon || item.id) && <img src={getItemImageUrl(item.icon || item.id)} alt={item.name} className="w-8 h-8" crossOrigin="anonymous" />}
                                <div>
                                  <div className="itl-tt-name">{item.name}</div>
                                </div>
                              </div>
                              <div className="itl-tt-stats">
                                {item.avg_placement && <div className="itl-tt-row"><span>Avg Place</span><span className={item.avg_placement <= 4.2 ? 'good' : ''}>{item.avg_placement.toFixed(2)}</span></div>}
                                {item.top4_rate != null && <div className="itl-tt-row"><span>Top 4%</span><span>{(item.top4_rate * 100).toFixed(1)}%</span></div>}
                                {item.usage_count != null && <div className="itl-tt-row"><span>Usage</span><span>{item.usage_count}</span></div>}
                              </div>
                              <div className="itl-tt-badge">✓ Admin Curated</div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <style>{`
        .itl-tier-row { display: flex; align-items: stretch; border-radius: 14px; border: 1px solid; overflow: hidden; min-height: 110px; }
        .itl-tier-label { flex-shrink: 0; width: 75px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.75rem 0; border-right: 1px solid; gap: 2px; }
        .itl-tier-letter { font-size: 2.2rem; font-weight: 900; font-family: 'Cinzel', serif; line-height: 1; }
        .itl-tier-sub { font-size: 0.55rem; font-weight: 800; letter-spacing: 0.15em; opacity: 0.7; }
        .itl-tier-count { font-size: 0.6rem; color: var(--color-text-muted); background: rgba(255,255,255,0.05); padding: 0.1rem 0.45rem; border-radius: 20px; margin-top: 2px; }

        .itl-item-grid { flex: 1; display: flex; flex-wrap: wrap; gap: 0.65rem; padding: 0.75rem; align-content: center; }
        .itl-empty { width: 100%; text-align: center; color: var(--color-text-muted); font-size: 0.75rem; opacity: 0.4; }

        .itl-item { display: flex; flex-direction: column; align-items: center; gap: 3px; position: relative; cursor: pointer; transition: transform 0.15s; flex-shrink: 0; }
        .itl-item:hover { transform: scale(1.12); z-index: 10; }

        .itl-item-img { width: 44px; height: 44px; border-radius: 8px; border: 1.5px solid; overflow: hidden; padding: 2px; background: var(--color-grimoire-light); position: relative; transition: box-shadow 0.2s; }

        .itl-item-name { font-size: 0.58rem; color: var(--color-text-muted); text-align: center; max-width: 56px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color 0.15s; }
        .itl-item:hover .itl-item-name { color: var(--color-text-primary); }

        .itl-item-stat { font-size: 0.55rem; font-weight: 700; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
        .itl-item-stat.good { color: var(--color-necrotic); }
        .itl-item-stat.bad { color: var(--color-blood); }

        /* Tooltip */
        .itl-tooltip { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: 8px; width: 200px; background: rgba(16,13,28,0.97); border: 1px solid rgba(167,139,250,0.2); border-radius: 12px; padding: 0.75rem; z-index: 100; pointer-events: none; box-shadow: 0 12px 40px rgba(0,0,0,0.6); }
        .itl-tt-header { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .itl-tt-name { font-size: 0.8rem; font-weight: 700; color: #f1effe; }
        .itl-tt-stats { display: flex; flex-direction: column; gap: 0.25rem; }
        .itl-tt-row { display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--color-text-secondary); }
        .itl-tt-row .good { color: var(--color-necrotic); font-weight: 700; }
        .itl-tt-badge { margin-top: 0.4rem; font-size: 0.62rem; font-weight: 700; color: var(--color-necrotic); background: rgba(0,255,136,0.08); padding: 0.15rem 0.5rem; border-radius: 20px; text-align: center; }

        @media (max-width: 640px) {
          .itl-tier-label { width: 55px; }
          .itl-tier-letter { font-size: 1.6rem; }
          .itl-item-img { width: 36px; height: 36px; }
        }
      `}</style>
    </div>
  );
}
