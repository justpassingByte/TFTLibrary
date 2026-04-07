'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { SpriteIcon } from '@/components/ui/sprite-icon';

const TABS = [
  { label: 'Comps', href: '/tierlist/comps', active: false },
  { label: 'Items', href: '/tierlist/items', active: false },
  { label: 'Augments', href: '/tierlist/augments', active: true },
];

const RARITY_COLORS: Record<string, { color: string; bg: string }> = {
  Silver: { color: '#9ca3af', bg: 'rgba(156,163,175,0.08)' },
  Gold:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
  Prismatic: { color: '#c084fc', bg: 'rgba(192,132,252,0.08)' },
};

const TIER_CONFIG = {
  S: { color: '#ff2244', bg: 'rgba(255,34,68,0.08)', glow: 'rgba(255,34,68,0.25)' },
  A: { color: '#FF7A00', bg: 'rgba(255,122,0,0.08)', glow: 'rgba(255,122,0,0.25)' },
  B: { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', glow: 'rgba(251,191,36,0.2)' },
  C: { color: '#39FF14', bg: 'rgba(57,255,20,0.08)', glow: 'rgba(57,255,20,0.2)' },
  D: { color: '#9A9A9A', bg: 'rgba(154,154,154,0.08)', glow: 'rgba(154,154,154,0.15)' },
};

type Tier = keyof typeof TIER_CONFIG;
const tiers: Tier[] = ['S', 'A', 'B', 'C', 'D'];

export interface AugmentMeta {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  rarity: string; // Silver/Gold/Prismatic
  tier: string;   // S/A/B/C/D (meta_tier)
  avg_placement: number | null;
  top4_rate: number | null;
  win_rate: number | null;
  sample_count: number | null;
}

export function AugmentsTierlistClient({ augments }: { augments: AugmentMeta[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [rarityFilter, setRarityFilter] = useState<'Silver' | 'Gold' | 'Prismatic'>('Gold');
  const [hoveredAug, setHoveredAug] = useState<string | null>(null);

  const filteredAugments = augments.filter(aug =>
    aug.rarity === rarityFilter &&
    aug.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Count per tier for summary
  const tierCounts = tiers.reduce((acc, t) => {
    acc[t] = filteredAugments.filter(a => a.tier === t).length;
    return acc;
  }, {} as Record<Tier, number>);

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs text-[var(--color-text-muted)] px-2 py-0.5 rounded bg-[var(--color-grimoire)] border border-[var(--color-border)]">Patch 16.8</span>
              <span className="text-xs text-[var(--color-necrotic)]">Admin Curated</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold flex items-center gap-3" style={{ fontFamily: "'Cinzel', serif" }}>
              <span className="text-3xl">🃏</span>
              AUGMENTS <span className="text-[var(--color-pumpkin)]">▸</span>{' '}
              <span className="gradient-text">TIERLIST</span>
            </h1>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </span>
              <input type="text" placeholder="Search augments..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-full bg-[var(--color-grimoire-light)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-amethyst)] transition-colors w-56" />
            </div>

            <div className="flex items-center gap-1 bg-[var(--color-grimoire-light)] p-1 rounded-full border border-[var(--color-border)]">
              {(['Silver', 'Gold', 'Prismatic'] as const).map(rarity => (
                <button key={rarity} onClick={() => setRarityFilter(rarity)}
                  className="atl-rarity-btn" data-active={rarityFilter === rarity}
                  style={rarityFilter === rarity ? { background: RARITY_COLORS[rarity].color, color: '#000' } : { color: RARITY_COLORS[rarity].color }}>
                  {rarity}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-[var(--color-border)]">
          {TABS.map(tab => (
            <Link key={tab.label} href={tab.href}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab.active ? 'border-[var(--color-pumpkin)] text-[var(--color-pumpkin)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`}>
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Rarity Summary Bar */}
        <div className="atl-summary">
          <div className="atl-rarity-info" style={{ color: RARITY_COLORS[rarityFilter].color }}>
            <span className="atl-rarity-dot" style={{ background: RARITY_COLORS[rarityFilter].color }} />
            {rarityFilter} Augments · {filteredAugments.length} total
          </div>
          <div className="atl-tier-summary">
            {tiers.map(t => (
              <span key={t} className="atl-tier-chip" style={{ color: TIER_CONFIG[t].color, borderColor: `${TIER_CONFIG[t].color}40` }}>
                {t}: {tierCounts[t]}
              </span>
            ))}
          </div>
        </div>

        {/* Tier Rows */}
        <div className="space-y-5">
          {tiers.map((tier, tierIdx) => {
            const tierAugs = filteredAugments.filter(a => a.tier === tier);
            const cfg = TIER_CONFIG[tier];

            return (
              <motion.div key={tier} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: tierIdx * 0.08 }} className="atl-tier-row" style={{ borderColor: `${cfg.color}40`, background: cfg.bg }}>

                {/* Tier label */}
                <div className="atl-tier-label" style={{ borderColor: `${cfg.color}30`, background: `${cfg.color}12` }}>
                  <span className="atl-tier-letter" style={{ color: cfg.color }}>{tier}</span>
                  <span className="atl-tier-sub" style={{ color: cfg.color }}>TIER</span>
                  <span className="atl-tier-count">{tierAugs.length}</span>
                </div>

                {/* Augments */}
                <div className="atl-aug-grid">
                  {tierAugs.length === 0 ? (
                    <div className="atl-empty">No augments in this tier</div>
                  ) : (
                    tierAugs.map(aug => {
                      const rarCfg = RARITY_COLORS[aug.rarity] || RARITY_COLORS.Gold;
                      return (
                        <div key={aug.id} className="atl-aug" onMouseEnter={() => setHoveredAug(aug.id)}
                          onMouseLeave={() => setHoveredAug(null)}>
                          <div className="atl-aug-icon" style={{
                            borderColor: hoveredAug === aug.id ? cfg.color : `${rarCfg.color}40`,
                            boxShadow: hoveredAug === aug.id ? `0 0 14px ${cfg.glow}` : 'none'
                          }}>
                            <SpriteIcon type="augment" id={aug.id} icon={aug.icon} className="w-full h-full object-contain pointer-events-none" alt={aug.name} scale={1} />
                          </div>
                          <span className="atl-aug-name">{aug.name}</span>

                          {/* Tooltip */}
                          <AnimatePresence>
                            {hoveredAug === aug.id && (
                              <motion.div className="atl-tooltip" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.12 }}>
                                <div className="atl-tt-header">
                                  <SpriteIcon type="augment" id={aug.id} icon={aug.icon} className="w-10 h-10" alt={aug.name} scale={1} />
                                  <div>
                                    <div className="atl-tt-name">{aug.name}</div>
                                    <div className="atl-tt-rarity" style={{ color: rarCfg.color }}>{aug.rarity}</div>
                                  </div>
                                </div>
                                {aug.description && <p className="atl-tt-desc">{aug.description.replace(/<[^>]+>/g, '')}</p>}
                                <div className="atl-tt-stats">
                                  {aug.avg_placement && <div className="atl-tt-row"><span>Avg Place</span><span className={aug.avg_placement <= 4.3 ? 'good' : ''}>{aug.avg_placement.toFixed(2)}</span></div>}
                                  {aug.top4_rate != null && <div className="atl-tt-row"><span>Top 4%</span><span>{(aug.top4_rate * 100).toFixed(1)}%</span></div>}
                                  {aug.win_rate != null && <div className="atl-tt-row"><span>Win%</span><span>{(aug.win_rate * 100).toFixed(1)}%</span></div>}
                                  {aug.sample_count != null && <div className="atl-tt-row"><span>Games</span><span>{aug.sample_count}</span></div>}
                                </div>
                                <div className="atl-tt-badge">✓ Admin Curated</div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <style>{`
        .atl-rarity-btn { padding: 0.3rem 0.8rem; font-size: 0.75rem; font-weight: 700; border: none; border-radius: 20px; cursor: pointer; background: transparent; transition: all 0.15s; }
        .atl-rarity-btn[data-active="true"] { font-weight: 900; }

        .atl-summary { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; padding: 0.5rem 0.75rem; background: var(--color-grimoire); border: 1px solid var(--color-border); border-radius: 10px; flex-wrap: wrap; gap: 0.5rem; }
        .atl-rarity-info { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; font-weight: 600; }
        .atl-rarity-dot { width: 8px; height: 8px; border-radius: 50%; }
        .atl-tier-summary { display: flex; gap: 0.3rem; }
        .atl-tier-chip { font-size: 0.65rem; font-weight: 800; padding: 0.15rem 0.5rem; border: 1px solid; border-radius: 20px; }

        .atl-tier-row { display: flex; align-items: stretch; border-radius: 14px; border: 1px solid; overflow: hidden; min-height: 120px; }
        .atl-tier-label { flex-shrink: 0; width: 75px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.75rem 0; border-right: 1px solid; gap: 2px; }
        .atl-tier-letter { font-size: 2.2rem; font-weight: 900; font-family: 'Cinzel', serif; line-height: 1; }
        .atl-tier-sub { font-size: 0.55rem; font-weight: 800; letter-spacing: 0.15em; opacity: 0.7; }
        .atl-tier-count { font-size: 0.6rem; color: var(--color-text-muted); background: rgba(255,255,255,0.05); padding: 0.1rem 0.45rem; border-radius: 20px; margin-top: 2px; }

        .atl-aug-grid { flex: 1; display: flex; flex-wrap: wrap; gap: 0.75rem; padding: 0.75rem 0.5rem; align-content: center; }
        .atl-empty { width: 100%; text-align: center; color: var(--color-text-muted); font-size: 0.75rem; opacity: 0.4; }

        .atl-aug { display: flex; flex-direction: column; align-items: center; gap: 3px; position: relative; cursor: pointer; transition: transform 0.15s; width: 70px; flex-shrink: 0; }
        .atl-aug:hover { transform: scale(1.12); z-index: 10; }

        .atl-aug-icon { width: 48px; height: 48px; border-radius: 10px; border: 1.5px solid; overflow: hidden; padding: 3px; background: var(--color-grimoire-light); position: relative; transition: all 0.2s; }

        .atl-aug-name { font-size: 0.58rem; color: var(--color-text-muted); text-align: center; max-width: 68px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color 0.15s; line-height: 1.2; }
        .atl-aug:hover .atl-aug-name { color: var(--color-text-primary); }

        .atl-aug-stat { font-size: 0.55rem; font-weight: 700; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
        .atl-aug-stat.good { color: var(--color-necrotic); }
        .atl-aug-stat.bad { color: var(--color-blood); }

        /* Tooltip */
        .atl-tooltip { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: 8px; width: 220px; background: rgba(16,13,28,0.97); border: 1px solid rgba(167,139,250,0.2); border-radius: 12px; padding: 0.75rem; z-index: 100; pointer-events: none; box-shadow: 0 12px 40px rgba(0,0,0,0.6); }
        .atl-tt-header { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.4rem; padding-bottom: 0.4rem; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .atl-tt-name { font-size: 0.82rem; font-weight: 700; color: #f1effe; }
        .atl-tt-rarity { font-size: 0.65rem; font-weight: 600; }
        .atl-tt-desc { font-size: 0.7rem; color: var(--color-text-muted); line-height: 1.4; margin: 0 0 0.4rem; }
        .atl-tt-stats { display: flex; flex-direction: column; gap: 0.2rem; }
        .atl-tt-row { display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--color-text-secondary); }
        .atl-tt-row .good { color: var(--color-necrotic); font-weight: 700; }
        .atl-tt-badge { margin-top: 0.4rem; font-size: 0.62rem; font-weight: 700; color: var(--color-necrotic); background: rgba(0,255,136,0.08); padding: 0.15rem 0.5rem; border-radius: 20px; text-align: center; }

        @media (max-width: 640px) {
          .atl-tier-label { width: 55px; }
          .atl-tier-letter { font-size: 1.6rem; }
          .atl-aug-icon { width: 40px; height: 40px; }
          .atl-aug { width: 56px; }
        }
      `}</style>
    </div>
  );
}
