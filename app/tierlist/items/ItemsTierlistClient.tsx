'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

import { getItemImageUrl } from '@/lib/riot-cdn';

const TABS = [
  { label: 'Comps', href: '/tierlist/comps', active: false },
  { label: 'Items', href: '/tierlist/items', active: true },
  { label: 'Augments', href: '/tierlist/augments', active: false },
];

const TIER_CONFIG = {
  S: { color: '#FACC15', bg: 'rgba(250,204,21,0.055)', glow: 'rgba(250,204,21,0.15)' },
  A: { color: '#D4AF37', bg: 'rgba(212,175,55,0.044)', glow: 'rgba(212,175,55,0.08)' },
  B: { color: '#8B6F2A', bg: 'rgba(139,111,42,0.038)', glow: 'rgba(139,111,42,0.06)' },
  C: { color: '#8FA7C2', bg: 'rgba(143,167,194,0.03)', glow: 'rgba(143,167,194,0.05)' },
  D: { color: '#8290A7', bg: 'rgba(130,144,167,0.026)', glow: 'rgba(130,144,167,0.04)' },
};

type Tier = keyof typeof TIER_CONFIG;
const tiers: Tier[] = ['S', 'A', 'B', 'C', 'D'];
const GOLD_TEXT_GRADIENT = 'linear-gradient(135deg, #FACC15 0%, #D4AF37 48%, #8B6F2A 100%)';

function tierPresence(tier: Tier) {
  if (tier === 'S') return { opacity: 1, filter: 'none' };
  if (tier === 'C') return { opacity: 0.85, filter: 'saturate(0.82)' };
  if (tier === 'D') return { opacity: 0.7, filter: 'saturate(0.72)' };
  return { opacity: 0.94, filter: 'none' };
}

function tierRowStyle(tier: Tier, cfg: (typeof TIER_CONFIG)[Tier]): CSSProperties {
  const presence = tierPresence(tier);
  return {
    borderColor: tier === 'S' ? 'rgba(250,204,21,0.28)' : tier === 'A' ? 'rgba(212,175,55,0.14)' : tier === 'B' ? 'rgba(139,111,42,0.12)' : 'rgba(255,255,255,0.05)',
    background: `linear-gradient(104deg, ${cfg.bg}, rgba(18,26,43,0.9) 31%, rgba(7,11,22,0.84)), linear-gradient(180deg, rgba(255,255,255,0.026), rgba(255,255,255,0) 42%)`,
    boxShadow: tier === 'S'
      ? 'inset 0 0 40px rgba(0,0,0,0.7), 0 10px 40px rgba(0,0,0,0.6), 0 0 18px rgba(250,204,21,0.16), 0 0 48px rgba(250,204,21,0.06)'
      : 'inset 0 0 40px rgba(0,0,0,0.7), 0 10px 40px rgba(0,0,0,0.6)',
    opacity: presence.opacity,
    filter: presence.filter,
    transform: tier === 'S' ? 'scale(1.01)' : 'scale(1)',
  };
}

function tierLetterStyle(tier: Tier, cfg: (typeof TIER_CONFIG)[Tier]): CSSProperties {
  if (tier === 'S') {
    return {
      background: GOLD_TEXT_GRADIENT,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      textShadow: '0 0 12px rgba(250,204,21,0.24)',
    };
  }
  return {
    color: cfg.color,
    textShadow: '0 1px 10px rgba(0,0,0,0.52)',
  };
}

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

const CATEGORIES = ['Craftable', 'Artifact', 'Radiant', 'Emblems'];

export function ItemsTierlistClient({ items }: { items: ItemMeta[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Craftable');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    item.category === categoryFilter
  );

  return (
    <div className="arcane-page min-h-screen pt-24 pb-20">
      <div className="arcane-glyph-layer opacity-[0.04]" />
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
              className="arcane-input px-4 py-2 text-sm placeholder:text-[var(--color-text-muted)] transition-colors w-48" />
          </div>
        </div>

        {/* Tabs */}
        <div className="arcane-tab-row flex gap-1 overflow-x-auto no-scrollbar">
          {TABS.map(tab => (
            <Link key={tab.label} href={tab.href}
              aria-current={tab.active ? 'page' : undefined}
              className={`arcane-tab px-5 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab.active ? 'border-transparent text-[var(--color-pumpkin)]'
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
                  ? 'bg-[rgba(250,204,21,0.09)] text-[var(--color-gold)] border-[rgba(212,175,55,0.38)]' 
                  : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-white hover:border-[rgba(250,204,21,0.18)]'
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
              <motion.div key={tier} initial={{ opacity: 0, x: -20 }} animate={{ opacity: tierPresence(tier).opacity, x: 0 }}
                transition={{ delay: tierIdx * 0.08 }} className="itl-tier-row" style={tierRowStyle(tier, cfg)}>

                {/* Tier label */}
                <div className="itl-tier-label" style={{ borderColor: tier === 'S' ? 'rgba(250,204,21,0.16)' : 'rgba(255,255,255,0.05)', background: `linear-gradient(175deg, ${cfg.bg}, rgba(10,15,31,0.42) 72%)` }}>
                  <span className="itl-tier-letter" data-tier={tier} style={tierLetterStyle(tier, cfg)}>{tier}</span>
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
                        <div className="itl-item-img" style={{ borderColor: `${cfg.color}${tier === 'S' ? '60' : '38'}`, boxShadow: hoveredItem === item.id ? `0 0 12px ${cfg.glow}, 0 0 34px rgba(250,204,21,0.03)` : 'none' }}>
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
        .itl-tier-row { display: flex; align-items: stretch; border-radius: 8px; border: 1px solid; overflow: hidden; min-height: 110px; backdrop-filter: blur(18px); transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease; }
        .itl-tier-row:hover { border-color: rgba(250,204,21,0.16) !important; box-shadow: inset 0 0 40px rgba(0,0,0,0.7), 0 10px 40px rgba(0,0,0,0.6), 0 0 16px rgba(250,204,21,0.08) !important; }
        .itl-tier-label { flex-shrink: 0; width: 75px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.75rem 0; border-right: 1px solid; gap: 2px; }
        .itl-tier-letter { font-size: 2.2rem; font-weight: 800; font-family: 'Cinzel', serif; line-height: 1; letter-spacing: 0.08em; }
        .itl-tier-letter[data-tier="S"] { font-size: 2.45rem; }
        .itl-tier-sub { font-size: 0.55rem; font-weight: 500; letter-spacing: 0.2em; opacity: 0.56; }
        .itl-tier-count { font-size: 0.6rem; color: var(--color-text-muted); background: rgba(255,255,255,0.05); padding: 0.1rem 0.45rem; border-radius: 20px; margin-top: 2px; }

        .itl-item-grid { flex: 1; display: flex; flex-wrap: wrap; gap: 0.65rem; padding: 0.75rem; align-content: center; }
        .itl-empty { width: 100%; text-align: center; color: var(--color-text-muted); font-size: 0.75rem; opacity: 0.4; }

        .itl-item { display: flex; flex-direction: column; align-items: center; gap: 3px; position: relative; cursor: pointer; transition: transform 0.15s; flex-shrink: 0; }
        .itl-item:hover { transform: scale(1.12); z-index: 10; }

        .itl-item-img { width: 44px; height: 44px; border-radius: 8px; border: 1.5px solid; overflow: hidden; padding: 2px; background: linear-gradient(180deg, rgba(24,34,56,0.9), rgba(10,15,31,0.92)); position: relative; transition: box-shadow 0.2s, border-color 0.2s; }

        .itl-item-name { font-size: 0.58rem; color: var(--color-text-muted); text-align: center; max-width: 56px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color 0.15s; }
        .itl-item:hover .itl-item-name { color: var(--color-text-primary); }

        .itl-item-stat { font-size: 0.55rem; font-weight: 700; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
        .itl-item-stat.good { color: var(--color-necrotic); }
        .itl-item-stat.bad { color: var(--color-blood); }

        /* Tooltip */
        .itl-tooltip { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: 8px; width: 200px; background: rgba(18,26,43,0.98); border: 1px solid rgba(250,204,21,0.16); border-radius: 8px; padding: 0.75rem; z-index: 100; pointer-events: none; box-shadow: inset 0 0 18px rgba(0,0,0,0.5), 0 18px 44px rgba(0,0,0,0.62), 0 0 18px rgba(250,204,21,0.06); }
        .itl-tt-header { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .itl-tt-name { font-size: 0.8rem; font-weight: 700; color: #F8FAFC; }
        .itl-tt-stats { display: flex; flex-direction: column; gap: 0.25rem; }
        .itl-tt-row { display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--color-text-secondary); }
        .itl-tt-row .good { color: #C7D7BE; font-weight: 700; }
        .itl-tt-badge { margin-top: 0.4rem; font-size: 0.62rem; font-weight: 700; color: #D4AF37; background: rgba(250,204,21,0.08); padding: 0.15rem 0.5rem; border-radius: 999px; text-align: center; }

        @media (max-width: 640px) {
          .itl-tier-label { width: 55px; }
          .itl-tier-letter { font-size: 1.6rem; }
          .itl-item-img { width: 36px; height: 36px; }
        }
      `}</style>
    </div>
  );
}
