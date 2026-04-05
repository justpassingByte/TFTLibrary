'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { COMPS, type CompData } from '@/lib/mock-data';
import { ChampionAvatar, HexagonFrame } from '@/components/ui/champion-avatar';
import { COST_COLORS, COST_BG } from '@/app/builder/builder-data';
import { SpriteIcon } from '@/components/ui/sprite-icon';

const TABS = [
  { label: 'Comps', href: '/tierlist/comps', active: true },
  { label: 'Items', href: '/tierlist/items', active: false },
  { label: 'Augments', href: '/tierlist/augments', active: false },
];

const TIER_CONFIG = {
  S: { label: 'S TIER', color: '#ff2244', bgClass: 'tier-s', textColor: 'text-[#ff2244]' },
  A: { label: 'A TIER', color: '#FF7A00', bgClass: 'tier-a', textColor: 'text-[#FF7A00]' },
  B: { label: 'B TIER', color: '#fbbf24', bgClass: 'tier-b', textColor: 'text-[#fbbf24]' },
  C: { label: 'C TIER', color: '#39FF14', bgClass: 'tier-c', textColor: 'text-[#39FF14]' },
  X: { label: 'SITUATIONAL', color: '#00f0ff', bgClass: 'tier-x', textColor: 'text-[#00f0ff]' },
};

function CompCard({ comp, onClick }: { comp: CompData; onClick: () => void }) {
  const tierCfg = TIER_CONFIG[comp.tier];
  const mainChamp = comp.champions[0];

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center gap-1 cursor-pointer transition-all duration-200"
    >
      {/* Champion hexagon */}
      {mainChamp ? (
        <div className="relative group-hover:scale-110 transition-transform duration-200"
             style={{ filter: `drop-shadow(0 0 8px ${tierCfg.color}40)` }}>
          <HexagonFrame color={tierCfg.color} bg={COST_BG[mainChamp.cost] || '#1a1a2e'} size={64} padding={2}>
            <ChampionAvatar name={mainChamp.name} shape="hexagon" className="w-[56px] h-[60px]" />
          </HexagonFrame>
        </div>
      ) : (
        <div
          className="w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center text-2xl bg-[var(--color-grimoire)] border-2 group-hover:scale-110 transition-transform duration-200"
          style={{ borderColor: tierCfg.color, boxShadow: `0 0 12px ${tierCfg.color}30` }}
        >
          ❓
        </div>
      )}
      
      {/* Carry icon */}
      {comp.champions.some(c => c.isCarry) && (
        <span className="absolute -top-1 -right-1 text-xs drop-shadow-md z-10">💀</span>
      )}
      {/* Name */}
      <span className="text-[10px] items-center text-[var(--color-text-muted)] text-center max-w-16 truncate group-hover:text-[var(--color-text-primary)] transition-colors">
        {comp.name.split(' ')[0]}
      </span>
    </button>
  );
}

function CompDetail({ comp, onClose }: { comp: CompData; onClose: () => void }) {
  const tierCfg = TIER_CONFIG[comp.tier];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative glass-strong rounded-2xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto"
        style={{ borderColor: tierCfg.color, borderWidth: 1 }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <span
            className={`px-3 py-1 rounded-lg text-sm font-bold ${tierCfg.textColor}`}
            style={{ borderColor: tierCfg.color, borderWidth: 1 }}
          >
            {tierCfg.label}
          </span>
          <div className={`px-2 py-0.5 rounded text-xs ${
            comp.difficulty === 'Easy' ? 'bg-green-900/40 text-green-400' :
            comp.difficulty === 'Medium' ? 'bg-yellow-900/40 text-yellow-400' :
            'bg-red-900/40 text-red-400'
          }`}>
            {comp.difficulty}
          </div>
        </div>

        <h2
          className="text-xl font-bold mb-4"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          {comp.name}
        </h2>

        {/* Champions row */}
        <div className="flex flex-wrap gap-2 mb-4">
          {comp.champions.map((champ) => (
            <div
              key={champ.id}
              className="flex flex-col items-center gap-0.5"
            >
              <div className="relative">
                <HexagonFrame color={COST_COLORS[champ.cost]} bg={COST_BG[champ.cost] || '#1a1a2e'} size={48} padding={1.5}>
                  <ChampionAvatar name={champ.name} shape="hexagon" className="w-[40px] h-[40px]" />
                </HexagonFrame>
                {champ.isCarry && <span className="absolute -top-1 -right-1 text-[10px] drop-shadow-md z-10">⭐</span>}
              </div>
              <span className="text-[9px] text-[var(--color-text-muted)] mt-1">{champ.name}</span>
              <span className="text-[8px]" style={{
                color: champ.cost === 5 ? '#fbbf24' : champ.cost === 4 ? '#a855f7' : champ.cost === 3 ? '#3b82f6' : champ.cost === 2 ? '#22c55e' : '#9ca3af',
              }}>
                {'⬡'.repeat(Math.min(champ.cost, 5))}
              </span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="grimoire-card p-3 text-center">
            <div className="text-lg font-bold text-[var(--color-necrotic)]">{comp.winrate}%</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">Win Rate</div>
          </div>
          <div className="grimoire-card p-3 text-center">
            <div className="text-lg font-bold text-[var(--color-pumpkin)]">{comp.pickrate}%</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">Pick Rate</div>
          </div>
          <div className="grimoire-card p-3 text-center">
            <div className="text-lg font-bold text-[var(--color-spectral)]">{comp.avgPlacement}</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">Avg Place</div>
          </div>
        </div>

        {/* Items */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-[var(--color-pumpkin)] uppercase mb-2">Key Items</h4>
          <div className="flex flex-wrap gap-2">
            {comp.keyItems.map(item => (
              <div key={item} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--color-grimoire-light)] border border-[var(--color-border)]">
                <SpriteIcon type="item" id={item} className="w-4 h-4 rounded-sm" alt={item} scale={16/48} />
                <span className="text-xs text-[var(--color-text-secondary)]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Augments */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-[var(--color-amethyst)] uppercase mb-2">Augments</h4>
          <div className="flex flex-wrap gap-2">
            {comp.augments.map(aug => (
              <div key={aug} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--color-amethyst)]/10 text-[var(--color-amethyst)] border border-[var(--color-amethyst)]/20">
                <SpriteIcon type="augment" id={aug} className="w-4 h-4 rounded-sm drop-shadow-sm" alt={aug} scale={16/48} />
                <span className="text-xs">{aug}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Strategy */}
        <div className="p-3 rounded-xl bg-[var(--color-grimoire-light)] border border-[var(--color-border)]">
          <h4 className="text-xs font-semibold text-[var(--color-gold)] uppercase mb-1.5">Strategy</h4>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {comp.strategy}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function TierlistCompsPage() {
  const [selectedComp, setSelectedComp] = useState<CompData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const tiers: ('S' | 'A' | 'B' | 'C' | 'X')[] = ['S', 'A', 'B', 'C', 'X'];

  const filteredComps = COMPS.filter(comp =>
    comp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs text-[var(--color-text-muted)] px-2 py-0.5 rounded bg-[var(--color-grimoire)] border border-[var(--color-border)]">
                Patch 16.8
              </span>
              <span className="text-xs text-[var(--color-necrotic)]">
                Last Updated 4 Hours Ago
              </span>
            </div>
            <h1
              className="text-3xl sm:text-4xl font-extrabold flex items-center gap-3"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              <span className="text-3xl">📜</span>
              COMPS <span className="text-[var(--color-pumpkin)]">▸</span>{' '}
              <span className="gradient-text">TIERLIST</span>
            </h1>
          </div>

          {/* Search + Filters */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search comps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 rounded-xl bg-[var(--color-grimoire)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-amethyst)] transition-colors w-48"
            />
            <span className="text-xs text-[var(--color-text-muted)] px-3 py-2 rounded-xl bg-[var(--color-grimoire)] border border-[var(--color-border)]">
              Set 16 ▾
            </span>
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
            const tierComps = filteredComps.filter(c => c.tier === tier);
            const cfg = TIER_CONFIG[tier];

            if (tierComps.length === 0) return null;

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

                {/* Comps */}
                <div className="flex-1 flex items-center gap-3 py-3 px-2 overflow-x-auto">
                  {tierComps.map(comp => (
                    <CompCard
                      key={comp.id}
                      comp={comp}
                      onClick={() => setSelectedComp(comp)}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedComp && (
          <CompDetail comp={selectedComp} onClose={() => setSelectedComp(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
