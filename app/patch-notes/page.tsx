'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { PATCH_VERSION, PATCH_CHANGES, PREDICTED_META } from '@/lib/patch-analysis';
import { ChampionAvatar } from '@/components/ui/champion-avatar';

const TIER_BADGE: Record<string, { color: string; bg: string; glow: string }> = {
  S: { color: '#ff2244', bg: 'rgba(255,34,68,0.12)', glow: 'rgba(255,34,68,0.25)' },
  A: { color: '#FF7A00', bg: 'rgba(255,122,0,0.12)', glow: 'rgba(255,122,0,0.2)' },
  B: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', glow: 'rgba(251,191,36,0.15)' },
  NERFED: { color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', glow: 'rgba(156,163,175,0.1)' },
};

export default function PatchNotesPage() {
  const buffs = PATCH_CHANGES.filter(c => c.changeType === 'buff');
  const nerfs = PATCH_CHANGES.filter(c => c.changeType === 'nerf');
  const adjusts = PATCH_CHANGES.filter(c => c.changeType === 'adjust');

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 text-[var(--color-pumpkin)] font-bold mb-2 uppercase text-sm tracking-wider">
            <span>⚡ Official Analysis</span>
            <span className="w-1 h-1 rounded-full bg-current" />
            <span>Updated Today</span>
          </div>
          <h1 
            className="text-4xl sm:text-5xl font-extrabold flex items-center gap-3 mb-4" 
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Patch {PATCH_VERSION} Meta Shift
          </h1>
          <p className="text-[var(--color-text-secondary)] max-w-2xl text-lg">
            Complete breakdown of buffs, nerfs, and how the meta will shift before real match data becomes available.
          </p>
        </div>

        {/* Change Log Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
          {/* Buffs */}
          <div className="grimoire-card flex flex-col h-full border-t border-t-[#39FF14]/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#39FF14]/5 blur-[64px] rounded-full" />
            <div className="p-6">
              <h2 className="text-xl font-bold flex items-center gap-3 mb-6">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#39FF14]/10 text-[#39FF14]">▲</span>
                Buffs
              </h2>
              <div className="space-y-4">
                {buffs.map(c => (
                  <div key={c.entity} className="flex justify-between items-center group relative z-10">
                    <div className="flex items-center gap-3">
                      {c.type === 'unit' ? (
                        <ChampionAvatar name={c.entity} className="w-8 h-8" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white/40 uppercase">
                          {c.type.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold">{c.entity}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">{c.stat}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-[#39FF14]">+{c.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Nerfs */}
          <div className="grimoire-card flex flex-col h-full border-t border-t-[#ff2244]/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff2244]/5 blur-[64px] rounded-full" />
            <div className="p-6">
              <h2 className="text-xl font-bold flex items-center gap-3 mb-6">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#ff2244]/10 text-[#ff2244]">▼</span>
                Nerfs
              </h2>
              <div className="space-y-4">
                {nerfs.map(c => (
                  <div key={c.entity} className="flex justify-between items-center group relative z-10">
                    <div className="flex items-center gap-3">
                      {c.type === 'unit' ? (
                        <ChampionAvatar name={c.entity} className="w-8 h-8" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white/40 uppercase">
                          {c.type.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold">{c.entity}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">{c.stat}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-[#ff2244]">{c.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Adjusted */}
          <div className="grimoire-card flex flex-col h-full border-t border-t-[#fbbf24]/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#fbbf24]/5 blur-[64px] rounded-full" />
            <div className="p-6">
              <h2 className="text-xl font-bold flex items-center gap-3 mb-6">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#fbbf24]/10 text-[#fbbf24]">~</span>
                Adjusted
              </h2>
              <div className="space-y-4">
                {adjusts.map(c => (
                  <div key={c.entity} className="flex justify-between items-center group relative z-10">
                    <div className="flex items-center gap-3">
                      {c.type === 'unit' ? (
                        <ChampionAvatar name={c.entity} className="w-8 h-8" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white/40 uppercase">
                          {c.type.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold">{c.entity}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">{c.stat}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-[var(--color-text-muted)]">~0</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Predicted Meta Comps */}
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3 mb-8" style={{ fontFamily: "'Cinzel', serif" }}>
            <span className="text-xl">🔮</span> Predicted Meta Candidates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {PREDICTED_META.map((comp, i) => {
              const badge = TIER_BADGE[comp.tier];
              return (
                <motion.div
                  key={comp.name}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="grimoire-card p-6 flex flex-col"
                  style={{ borderColor: badge.color + '30', boxShadow: `0 0 16px ${badge.glow} inset` }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="text-sm font-black px-3 py-1.5 rounded-lg"
                      style={{ color: badge.color, backgroundColor: badge.bg, border: `1px solid ${badge.color}40`, fontFamily: "'Cinzel', serif" }}
                    >
                      {comp.tier === 'NERFED' ? '↓ NERFED' : `${comp.tier} TIER`}
                    </span>
                    <span
                      className="text-lg font-bold"
                      style={{ color: comp.score > 0 ? '#39FF14' : comp.score < 0 ? '#ff2244' : '#fbbf24' }}
                    >
                      {comp.score > 0 ? '+' : ''}{comp.score} Impact
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "'Cinzel', serif" }}>
                    {comp.name}
                  </h3>

                  {/* Character Avatars Row */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {comp.keyUnits.map(unitName => (
                      <ChampionAvatar key={unitName} name={unitName} />
                    ))}
                  </div>

                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed flex-1">
                    {comp.reason}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
