'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChampionAvatar } from '@/components/ui/champion-avatar';

const TIER_BADGE: Record<string, { color: string; bg: string; glow: string }> = {
  S: { color: '#FACC15', bg: 'rgba(250,204,21,0.08)', glow: 'rgba(250,204,21,0.2)' },
  A: { color: '#D4AF37', bg: 'rgba(212,175,55,0.07)', glow: 'rgba(212,175,55,0.15)' },
  B: { color: '#8B6F2A', bg: 'rgba(139,111,42,0.06)', glow: 'rgba(139,111,42,0.12)' },
  NERFED: { color: '#8290A7', bg: 'rgba(130,144,167,0.06)', glow: 'rgba(130,144,167,0.09)' },
};

interface PatchChange {
  entity: string;
  entity_id?: string;
  type: string;
  changeType: string;
  stat: string;
  score: number;
  tier?: number;
  iconUrl?: string;
}

interface PatchPrediction {
  name: string;
  tier: string;
  score: number;
  reason: string;
  keyUnits: string[];
  buffedEntities: string[];
  nerfedEntities: string[];
}

interface PatchData {
  version: string;
  changes: PatchChange[];
  predictions: PatchPrediction[];
}

type GroupedChange = {
  entity: string;
  entity_id?: string;
  type: string;
  tier?: number;
  iconUrl?: string;
  changes: Array<{ changeType: string; stat: string; score: number }>;
  netScore: number;
};

// Extracted Trait/Augment UI helper to avoid generic letters
function GenericIcon({ name, type, iconUrl }: { name: string, type: string, iconUrl?: string }) {
  if (iconUrl) {
    return (
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-inner overflow-hidden flex-shrink-0 ${type === 'trait' ? 'bg-[var(--color-grimoire-light)]' : 'bg-[var(--color-grimoire)] border border-white/10'}`}>
        <img 
          src={iconUrl} 
          alt={name}
          className="w-10 h-10 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.innerText = name.substring(0, 2).toUpperCase();
          }}
        />
      </div>
    );
  }

  // Fallback if no iconUrl provided
  const colors = type === 'augment' ? 'border-[#8FA7C2]/30 text-[#8FA7C2]/70 bg-[#8FA7C2]/5' : type === 'trait' ? 'border-[#BCA4D8]/30 text-[#BCA4D8]/70 bg-[#BCA4D8]/5' : 'border-[#D4AF37]/30 text-[#D4AF37]/70 bg-[#D4AF37]/5';
  
  return (
    <div className={`w-12 h-12 rounded-lg ${colors} flex items-center justify-center font-bold shadow-inner overflow-hidden flex-shrink-0 border`}>
      <span className="text-sm tracking-wider">{name.substring(0, 2).toUpperCase()}</span>
    </div>
  );
}

export default function PatchNotesPage() {
  const [data, setData] = useState<PatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters - Default to Tier 1 instead of ALL
  const [championFilter, setChampionFilter] = useState<1 | 2 | 3 | 4 | 5>(1);

  useEffect(() => {
    async function load() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        let setPrefix = 'TFT16';
        try {
          const settingsRes = await fetch(`${apiUrl}/api/admin/settings`, { cache: 'no-store' });
          if (settingsRes.ok) {
            setPrefix = (await settingsRes.json()).active_set || 'TFT16';
          }
        } catch(e) {}

        const res = await fetch(`${apiUrl}/api/meta/patch-notes?set_prefix=${setPrefix}`);
        if (!res.ok) throw new Error('Network error');
        const result = await res.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const groupedData = useMemo(() => {
    if (!data) return { units: [], traits: [], augments: [], systems: [] };

    const map = new Map<string, GroupedChange>();
    for (const c of data.changes) {
      if (!map.has(c.entity)) {
        map.set(c.entity, { entity: c.entity, entity_id: c.entity_id, type: c.type, tier: c.tier, iconUrl: c.iconUrl, changes: [], netScore: 0 });
      }
      const g = map.get(c.entity)!;
      g.changes.push({ changeType: c.changeType, stat: c.stat, score: c.score });
      g.netScore += c.score;
    }

    const all = Array.from(map.values()).sort((a, b) => b.netScore - a.netScore); // Best buffs first

    return {
      units: all.filter(c => c.type === 'unit'),
      traits: all.filter(c => c.type === 'trait'),
      augments: all.filter(c => c.type === 'augment'),
      systems: all.filter(c => c.type === 'system'),
    };
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[var(--color-pumpkin)]/70 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[var(--color-text-muted)] tracking-widest font-bold uppercase text-sm">Decoding Patch...</p>
      </div>
    );
  }

  if (error || !data || !data.version) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <h2 className="text-3xl font-extrabold mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Data Unavailable</h2>
        <p className="text-[var(--color-text-secondary)]">The latest patch notes have not been synchronized yet.</p>
      </div>
    );
  }

  const filteredUnits = groupedData.units.filter(u => u.tier === championFilter);

  return (
    <div className="min-h-screen pt-24 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* -- Hero Section -- */}
        <div className="text-center mb-20 relative">
          <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[rgba(250,204,21,0.18)] to-transparent pointer-events-none" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-6">
              <span className="w-2 h-2 rounded-full bg-[#C7D7BE] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#C7D7BE]">Patch {data.version} Live</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6" style={{ fontFamily: "'Cinzel', serif", textShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
              Metagame <span className="gradient-text">Shift</span>
            </h1>
            <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto">
              A comprehensive breakdown of all adjustments and our algorithmic predictions for the upcoming Tier List.
            </p>
          </motion.div>
        </div>

        {/* -- Predictions Section -- */}
        <div className="mb-24">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-3xl font-bold" style={{ fontFamily: "'Cinzel', serif" }}>🔮 Predicted Winners & Losers</h2>
            <div className="h-px bg-white/10 flex-1" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {data.predictions.map((p, i) => {
              const b = TIER_BADGE[p.tier] || TIER_BADGE.B;
              return (
                <motion.div
                  key={p.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="grimoire-card relative overflow-hidden flex flex-col h-full bg-[#0E0E12] border border-white/5"
                >
                  <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at top right, ${b.color}, transparent 60%)` }} />
                  
                  <div className="p-6 relative z-10 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-5">
                      <span className="px-3 py-1 rounded bg-[#000] text-xs font-black border uppercase tracking-wider" style={{ color: b.color, borderColor: b.color + '40' }}>
                        {p.tier === 'NERFED' ? 'Nerfed' : p.tier + ' Tier'}
                      </span>
                      <span className="font-bold text-lg" style={{ color: p.score > 0 ? '#C7D7BE' : p.score < 0 ? '#FCA5A5' : '#D4AF37' }}>
                        {p.score > 0 ? '+' : ''}{p.score}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold mb-4 line-clamp-2" style={{ fontFamily: "'Cinzel', serif" }}>{p.name}</h3>
                    
                    <div className="flex flex-wrap gap-2 mb-6">
                      {p.keyUnits.map(u => <ChampionAvatar key={u} name={u} className="w-9 h-9" />)}
                    </div>

                    <p className="text-xs text-[var(--color-text-muted)] flex-1 leading-relaxed border-t border-white/5 pt-4">
                      {p.reason}
                    </p>
                  </div>
                </motion.div>
              );
            })}
            
            {data.predictions.length === 0 && (
              <p className="text-[var(--color-text-muted)] italic">No meta predictions available yet.</p>
            )}
          </div>
        </div>

        {/* -- Detailed Changes -- */}
        <div>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-3xl font-bold" style={{ fontFamily: "'Cinzel', serif" }}>📝 Detailed Adjustments</h2>
            <div className="h-px bg-white/10 flex-1" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-10">
            
            {/* Left Column: Champions */}
            <div className="grimoire-card p-6 relative flex flex-col">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <span className="text-2xl">⚔️</span> Champions
                </h3>
                
                {/* Tier Filter */}
                <div className="flex bg-[var(--color-grimoire-light)] rounded-lg p-1 border border-[var(--color-border)]">
                  <FilterBtn active={championFilter === 1} onClick={() => setChampionFilter(1)}>Tier 1</FilterBtn>
                  <FilterBtn active={championFilter === 2} onClick={() => setChampionFilter(2)}>Tier 2</FilterBtn>
                  <FilterBtn active={championFilter === 3} onClick={() => setChampionFilter(3)}>Tier 3</FilterBtn>
                  <FilterBtn active={championFilter === 4} onClick={() => setChampionFilter(4)}>Tier 4</FilterBtn>
                  <FilterBtn active={championFilter === 5} onClick={() => setChampionFilter(5)}>Tier 5</FilterBtn>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <AnimatePresence mode="popLayout">
                  {filteredUnits.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-gray-500 italic p-4 text-center">
                      No changes for this tier.
                    </motion.div>
                  )}
                  {filteredUnits.map((g) => (
                    <ChangeCard key={g.entity} group={g} />
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Right Column: Traits, Augments, Systems */}
            <div className="space-y-8">
              <ChangeGroup title="Traits" icon="🛡️" groups={groupedData.traits} />
              <ChangeGroup title="Augments" icon="💠" groups={groupedData.augments} />
              <ChangeGroup title="System & Items" icon="⚙️" groups={groupedData.systems} />
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

// Custom Filter Button
function FilterBtn({ active, onClick, children }: { active: boolean, onClick: () => void, children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
        active ? 'bg-[rgba(250,204,21,0.09)] text-[var(--color-gold)] border border-[rgba(212,175,55,0.36)] shadow font-black' : 'text-white/40 border border-transparent hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}

// Subcomponent to render a category of changes (Traits/Augments)
function ChangeGroup({ title, icon, groups }: { title: string, icon: string, groups: GroupedChange[] }) {
  if (groups.length === 0) return null;

  return (
    <div className="grimoire-card p-6 relative">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-3 border-b border-white/5 pb-4">
        <span className="text-2xl">{icon}</span>
        {title}
      </h3>
      
      <div className="space-y-4">
        {groups.map((g) => (
          <ChangeCard key={g.entity} group={g} />
        ))}
      </div>
    </div>
  );
}

// Render a single merged entity card (Champion, Trait, etc) with ALL its stat updates
function ChangeCard({ group }: { group: GroupedChange }) {
  // Determine overall badge based on netScore
  const overallType = group.netScore > 0 ? 'buff' : group.netScore < 0 ? 'nerf' : 'adjust';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="flex gap-4 items-start p-4 bg-[rgba(10,15,31,0.28)] rounded-lg border border-white/5 hover:border-[rgba(250,204,21,0.16)] transition-colors"
    >
      {group.type === 'unit' ? (
        <ChampionAvatar id={group.entity_id} name={group.entity} icon={group.iconUrl} className="w-12 h-12 shadow-lg" />
      ) : (
        <GenericIcon name={group.entity} type={group.type} iconUrl={group.iconUrl} />
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#E8E8E8] text-lg">{group.entity}</span>
            {group.tier && <span className="text-xs text-[#E8E8E8]/40 border border-white/10 px-1.5 py-0.5 rounded">Tier {group.tier}</span>}
          </div>
          <ChangeBadge type={overallType} />
        </div>
        
        <div className="space-y-1.5">
          {group.changes.map((c, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between text-sm text-[var(--color-text-muted)] group/line rounded px-2 -mx-2 hover:bg-white/5 py-0.5">
              <p className="leading-relaxed break-words">{formatStat(c.stat)}</p>
              {/* Optional smaller indicator if individual stat was nerfed/buffed */}
              {Math.abs(c.score) >= 1 && (
                <span className={`text-[10px] font-bold ${c.score > 0 ? 'text-[#C7D7BE]' : 'text-[#FCA5A5]'}`}>
                  {c.score > 0 ? '+' : ''}{c.score}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Badge for Buff/Nerf/Adjust
function ChangeBadge({ type }: { type: string }) {
  if (type === 'buff') {
    return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#C7D7BE]/10 text-[#C7D7BE] border border-[#C7D7BE]/20 tracking-wider">▲ Buff</span>;
  }
  if (type === 'nerf') {
    return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#B45309]/10 text-[#FCA5A5] border border-[#B45309]/20 tracking-wider">▼ Nerf</span>;
  }
  return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 tracking-wider">~ Adjust</span>;
}

// Function to slightly format raw stat strings, making the "→" arrow pop and keys distinct
function formatStat(stat: string) {
  if (!stat.includes('→') && !stat.includes(':')) return stat;
  
  // Split on colon if exists to highlight the property name
  const colonParts = stat.split(':');
  const hasPropName = colonParts.length > 1;
  const propName = hasPropName ? colonParts[0] : '';
  const valuePart = hasPropName ? colonParts.slice(1).join(':') : stat;

  if (!valuePart.includes('→')) {
    return (
      <>
        {hasPropName && <span className="text-white/70 font-medium mr-1">{propName}:</span>}
        <span>{valuePart}</span>
      </>
    );
  }

  const arrowParts = valuePart.split('→');
  return (
    <>
      {hasPropName && <span className="text-white/80 font-medium mr-2 inline-flex items-center relative top-[-1px]">{propName}:</span>}
      <span className="opacity-60">{arrowParts[0]}</span>
      <span className="mx-2 text-[#D4AF37] opacity-80 text-lg leading-none align-middle font-black">→</span>
      <span className="text-white font-bold">{arrowParts[1]}</span>
    </>
  );
}
