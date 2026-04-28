'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { GameIcon } from '@/components/ui/game-icon';

const TABS = [
  { label: 'Comps', href: '/tierlist/comps', active: false },
  { label: 'Items', href: '/tierlist/items', active: false },
  { label: 'Augments', href: '/tierlist/augments', active: true },
];

const RARITY_COLORS: Record<string, { color: string; bg: string }> = {
  Silver: { color: '#A7B0BF', bg: 'rgba(167,176,191,0.07)' },
  Gold:   { color: '#D4AF37', bg: 'rgba(212,175,55,0.075)' },
  Prismatic: { color: '#BCA4D8', bg: 'rgba(188,164,216,0.065)' },
};

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
    <div className="arcane-page min-h-screen pt-24 pb-20">
      <div className="arcane-glyph-layer opacity-[0.04]" />
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
                className="arcane-input pl-9 pr-4 py-2 text-sm placeholder:text-[var(--color-text-muted)] transition-colors w-56" />
            </div>

            <div className="arcane-surface flex items-center gap-1 p-1 rounded-full">
              {(['Silver', 'Gold', 'Prismatic'] as const).map(rarity => (
                <button key={rarity} onClick={() => setRarityFilter(rarity)}
                  className="atl-rarity-btn" data-active={rarityFilter === rarity}
                  style={rarityFilter === rarity ? { background: RARITY_COLORS[rarity].bg, color: RARITY_COLORS[rarity].color, borderColor: `${RARITY_COLORS[rarity].color}66` } : { color: RARITY_COLORS[rarity].color }}>
                  {rarity}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="arcane-tab-row flex gap-1 mb-6">
          {TABS.map(tab => (
            <Link key={tab.label} href={tab.href}
              aria-current={tab.active ? 'page' : undefined}
              className={`arcane-tab px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab.active ? 'border-transparent text-[var(--color-pumpkin)]'
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
              <motion.div key={tier} initial={{ opacity: 0, x: -20 }} animate={{ opacity: tierPresence(tier).opacity, x: 0 }}
                transition={{ delay: tierIdx * 0.08 }} className="atl-tier-row" style={tierRowStyle(tier, cfg)}>

                {/* Tier label */}
                <div className="atl-tier-label" style={{ borderColor: tier === 'S' ? 'rgba(250,204,21,0.16)' : 'rgba(255,255,255,0.05)', background: `linear-gradient(175deg, ${cfg.bg}, rgba(10,15,31,0.42) 72%)` }}>
                  <span className="atl-tier-letter" data-tier={tier} style={tierLetterStyle(tier, cfg)}>{tier}</span>
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
                            boxShadow: hoveredAug === aug.id ? `0 0 12px ${cfg.glow}, 0 0 34px rgba(250,204,21,0.03)` : 'none'
                          }}>
                            <GameIcon type="augment" id={aug.id} icon={aug.icon} className="w-full h-full object-contain pointer-events-none" alt={aug.name} scale={1} />
                          </div>
                          <span className="atl-aug-name">{aug.name}</span>

                          {/* Tooltip */}
                          <AnimatePresence>
                            {hoveredAug === aug.id && (
                              <motion.div className="atl-tooltip" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.12 }}>
                                <div className="atl-tt-header">
                                  <GameIcon type="augment" id={aug.id} icon={aug.icon} className="w-10 h-10" alt={aug.name} scale={1} />
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
        .atl-rarity-btn { padding: 0.3rem 0.8rem; font-size: 0.75rem; font-weight: 700; border: 1px solid transparent; border-radius: 999px; cursor: pointer; background: transparent; transition: all 0.15s; }
        .atl-rarity-btn[data-active="true"] { font-weight: 800; box-shadow: 0 0 14px rgba(250,204,21,0.08); }

        .atl-summary { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; padding: 0.5rem 0.75rem; background: rgba(18,26,43,0.72); border: 1px solid var(--color-border); border-radius: 8px; flex-wrap: wrap; gap: 0.5rem; box-shadow: inset 0 1px 0 rgba(255,255,255,0.035); }
        .atl-rarity-info { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; font-weight: 600; }
        .atl-rarity-dot { width: 8px; height: 8px; border-radius: 50%; }
        .atl-tier-summary { display: flex; gap: 0.3rem; }
        .atl-tier-chip { font-size: 0.65rem; font-weight: 800; padding: 0.15rem 0.5rem; border: 1px solid; border-radius: 20px; }

        .atl-tier-row { display: flex; align-items: stretch; border-radius: 8px; border: 1px solid; overflow: hidden; min-height: 120px; backdrop-filter: blur(18px); transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease; }
        .atl-tier-row:hover { border-color: rgba(250,204,21,0.16) !important; box-shadow: inset 0 0 40px rgba(0,0,0,0.7), 0 10px 40px rgba(0,0,0,0.6), 0 0 16px rgba(250,204,21,0.08) !important; }
        .atl-tier-label { flex-shrink: 0; width: 75px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.75rem 0; border-right: 1px solid; gap: 2px; }
        .atl-tier-letter { font-size: 2.2rem; font-weight: 800; font-family: 'Cinzel', serif; line-height: 1; letter-spacing: 0.08em; }
        .atl-tier-letter[data-tier="S"] { font-size: 2.45rem; }
        .atl-tier-sub { font-size: 0.55rem; font-weight: 500; letter-spacing: 0.2em; opacity: 0.56; }
        .atl-tier-count { font-size: 0.6rem; color: var(--color-text-muted); background: rgba(255,255,255,0.05); padding: 0.1rem 0.45rem; border-radius: 20px; margin-top: 2px; }

        .atl-aug-grid { flex: 1; display: flex; flex-wrap: wrap; gap: 0.75rem; padding: 0.75rem 0.5rem; align-content: center; }
        .atl-empty { width: 100%; text-align: center; color: var(--color-text-muted); font-size: 0.75rem; opacity: 0.4; }

        .atl-aug { display: flex; flex-direction: column; align-items: center; gap: 3px; position: relative; cursor: pointer; transition: transform 0.15s; width: 70px; flex-shrink: 0; }
        .atl-aug:hover { transform: scale(1.12); z-index: 10; }

        .atl-aug-icon { width: 48px; height: 48px; border-radius: 8px; border: 1.5px solid; overflow: hidden; padding: 3px; background: linear-gradient(180deg, rgba(24,34,56,0.9), rgba(10,15,31,0.92)); position: relative; transition: all 0.2s; }

        .atl-aug-name { font-size: 0.58rem; color: var(--color-text-muted); text-align: center; max-width: 68px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color 0.15s; line-height: 1.2; }
        .atl-aug:hover .atl-aug-name { color: var(--color-text-primary); }

        .atl-aug-stat { font-size: 0.55rem; font-weight: 700; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
        .atl-aug-stat.good { color: var(--color-necrotic); }
        .atl-aug-stat.bad { color: var(--color-blood); }

        /* Tooltip */
        .atl-tooltip { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: 8px; width: 220px; background: rgba(18,26,43,0.98); border: 1px solid rgba(250,204,21,0.16); border-radius: 8px; padding: 0.75rem; z-index: 100; pointer-events: none; box-shadow: inset 0 0 18px rgba(0,0,0,0.5), 0 18px 44px rgba(0,0,0,0.62), 0 0 18px rgba(250,204,21,0.06); }
        .atl-tt-header { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.4rem; padding-bottom: 0.4rem; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .atl-tt-name { font-size: 0.82rem; font-weight: 700; color: #F8FAFC; }
        .atl-tt-rarity { font-size: 0.65rem; font-weight: 600; }
        .atl-tt-desc { font-size: 0.7rem; color: var(--color-text-muted); line-height: 1.4; margin: 0 0 0.4rem; }
        .atl-tt-stats { display: flex; flex-direction: column; gap: 0.2rem; }
        .atl-tt-row { display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--color-text-secondary); }
        .atl-tt-row .good { color: #C7D7BE; font-weight: 700; }
        .atl-tt-badge { margin-top: 0.4rem; font-size: 0.62rem; font-weight: 700; color: #D4AF37; background: rgba(250,204,21,0.08); padding: 0.15rem 0.5rem; border-radius: 999px; text-align: center; }

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
