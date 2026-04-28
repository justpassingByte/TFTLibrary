'use client';

import { useState, useMemo, type CSSProperties } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChampionAvatar, HexagonFrame } from '@/components/ui/champion-avatar';
import { GameIcon } from '@/components/ui/game-icon';
import { getItemImageUrl } from '@/lib/riot-cdn';


const DDRAGON_CDN = 'https://ddragon.leagueoflegends.com/cdn/16.7.1/img';

const COST_COLORS: Record<number, string> = { 1:'#9CA3AF', 2:'#8DAE8F', 3:'#8FA7C2', 4:'#BCA4D8', 5:'#D4AF37' };
const COST_BG: Record<number, string> = { 1:'#151B2A', 2:'#121F23', 3:'#111D31', 4:'#1C1930', 5:'#282111' };

export interface ChampionData { id: string; name: string; cost: number; icon: string | null; traits: string[] }
export interface ItemData { id: string; name: string; icon: string | null }

const TABS = [
  { label: 'Comps', href: '/tierlist/comps', active: true },
  { label: 'Items', href: '/tierlist/items', active: false },
  { label: 'Augments', href: '/tierlist/augments', active: false },
];

const TIER_CONFIG = {
  S: { label: 'S', color: '#FACC15', bg: 'rgba(250,204,21,0.055)', glow: 'rgba(250,204,21,0.15)' },
  A: { label: 'A', color: '#D4AF37', bg: 'rgba(212,175,55,0.044)', glow: 'rgba(212,175,55,0.08)' },
  B: { label: 'B', color: '#8B6F2A', bg: 'rgba(139,111,42,0.038)', glow: 'rgba(139,111,42,0.06)' },
  C: { label: 'C', color: '#8FA7C2', bg: 'rgba(143,167,194,0.03)', glow: 'rgba(143,167,194,0.05)' },
};

type Tier = keyof typeof TIER_CONFIG;
const TIERS: Tier[] = ['S', 'A', 'B', 'C'];
const GOLD_TEXT_GRADIENT = 'linear-gradient(135deg, #FACC15 0%, #D4AF37 48%, #8B6F2A 100%)';

function tierPresence(tier: Tier) {
  if (tier === 'S') return { opacity: 1, filter: 'none' };
  if (tier === 'C') return { opacity: 0.85, filter: 'saturate(0.82)' };
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

interface CompChamp { id: string; star: number; is_carry: boolean; items?: string[] }
interface BoardPos { champion_id: string; row: number; col: number }
interface StagePlan { stage: string; text: string }
interface AltBuild { carry_id: string; items: string[] }

interface CuratedComp {
  id: string; name: string; tier: Tier; carry_id: string;
  playstyle: string; difficulty: string; champions: CompChamp[];
  early_units: string[]; flex_units: string[];
  item_priority: string[]; alt_builds: AltBuild[];
  augments: string[]; augment_priority: string[];
  board_positions: BoardPos[]; tips: string; stage_plans: StagePlan[];
  variant_label: string; variants: CuratedComp[];
}

// ── Carry Card ───────────────────────────────────────
function CompCard({ comp, isSelected, onClick, champMap }: { comp: CuratedComp; isSelected: boolean; onClick: () => void; champMap: Record<string, ChampionData> }) {
  const cfg = TIER_CONFIG[comp.tier] || TIER_CONFIG.B;
  const carry = champMap[comp.carry_id];
  const cost = carry?.cost || 1;

  return (
    <button onClick={onClick} className={`comp-card-btn ${isSelected ? 'selected' : ''}`} title={comp.name}>
      <div className="comp-card-hex">
        {carry ? (
          <HexagonFrame color={cfg.color} bg={COST_BG[cost]} size={68} padding={2.5}>
            <ChampionAvatar id={carry.id} name={carry.name} icon={carry.icon || undefined} shape="hexagon" className="w-[60px] h-[60px]" />
          </HexagonFrame>
        ) : (
          <div className="comp-card-placeholder" style={{ borderColor: cfg.color }}>?</div>
        )}
        <div className="comp-card-carry-badge" style={{ borderColor: cfg.color }}>⭐</div>
        {isSelected && <div className="comp-card-arrow" />}
      </div>
    </button>
  );
}

function TraitBadge({ t, traitsDb = [] }: { t: { name: string, count: number }, traitsDb?: any[] }) {
  const isPrismatic = t.count >= 6;
  const isGold = t.count >= 4 && t.count < 6;
  const isSilver = t.count >= 2 && t.count < 4;
  
  let tier = 'bronze';
  if (isPrismatic) tier = 'prismatic';
  else if (isGold) tier = 'gold';
  else if (isSilver) tier = 'silver';
  if (t.count === 1) tier = 'bronze';

  const styles = {
    prismatic: {
      hex: 'linear-gradient(135deg, #f7b490 0%, #eb6851 100%)',
      tail: '#c95642',
    },
    gold: {
      hex: 'linear-gradient(135deg, #d4a24c 0%, #aa7a22 100%)',
      tail: '#8b6118',
    },
    silver: {
      hex: 'linear-gradient(135deg, #a8b7c0 0%, #7d9099 100%)',
      tail: '#5f7078',
    },
    bronze: {
      hex: 'linear-gradient(135deg, #916c5a 0%, #6d4b3b 100%)',
      tail: '#4c3327',
    }
  };

  const s = styles[tier as keyof typeof styles];

  return (
    <div className="flex items-center drop-shadow-sm group hover:drop-shadow-md transition-all shrink-0">
      {/* Pointy-topped Hexagon */}
      <div 
        className="relative z-10 w-[28px] h-[32px] flex items-center justify-center shrink-0"
        style={{
          background: s.hex,
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' 
        }}
      >
      <div 
        className="w-[18px] h-[18px]" 
        style={{ filter: 'brightness(0) invert(1) drop-shadow(0px 1px 1px rgba(0,0,0,0.5))' }}
      >
        <GameIcon 
          type="trait" 
          id={t.name} 
          icon={traitsDb.find(tr => tr.name === t.name)?.icon}
          alt={t.name} 
          className="w-full h-full" 
        />
      </div>
      </div>

      {/* Right chevron tail */}
      <div 
        className="relative -ml-[6px] pl-[10px] pr-[10px] h-[22px] flex items-center justify-center text-white text-[13px] font-bold"
        style={{
          background: s.tail,
          clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 0 100%)'
        }}
      >
        {t.count}
      </div>
    </div>
  );
}

// ── Expanded Detail ──────────────────────────────────
function CompDetails({ comp, traitsMap, onClose, champMap, itemMap, augments = [], traitsDb = [] }: { comp: CuratedComp; traitsMap: Record<string, string[]>; onClose: () => void; champMap: Record<string, ChampionData>; itemMap: Record<string, ItemData>; augments?: any[]; traitsDb?: any[]; }) {
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);
  const allVariants = [comp, ...(comp.variants || [])];
  const active = allVariants[activeVariantIdx] || comp;
  const cfg = TIER_CONFIG[active.tier as Tier] || TIER_CONFIG.B;

  const carry = champMap[active.carry_id];
  const champList = (active.champions as CompChamp[]) || [];
  const dbTraits = Object.values((active as any).active_traits as {name: string, count: number}[] || []).sort((a,b) => b.count - a.count);

  const stagePlans = (active.stage_plans as StagePlan[]) || [];

  return (
    <div className="comp-detail" style={{
      borderColor: active.tier === 'S' ? 'rgba(250,204,21,0.28)' : 'rgba(255,255,255,0.05)',
      boxShadow: active.tier === 'S'
        ? 'inset 0 0 20px rgba(0,0,0,0.7), 0 10px 30px rgba(0,0,0,0.5), 0 0 12px rgba(250,204,21,0.15), 0 0 40px rgba(250,204,21,0.05)'
        : 'inset 0 0 20px rgba(0,0,0,0.7), 0 10px 30px rgba(0,0,0,0.5)',
    }}>
      {/* ── Left Panel ── */}
      <div className="cd-left" style={{ background: `linear-gradient(to bottom, ${cfg.color}12, rgba(18,26,43,0.98) 62%)` }}>
        <div className="cd-left-top-bg" style={{ background: `radial-gradient(ellipse at 50% 0%, ${cfg.color}${active.tier === 'S' ? '22' : '12'} 0%, transparent 76%)` }} />
        
        <div className="cd-tier-badge" style={{
          borderColor: cfg.color,
          boxShadow: active.tier === 'S'
            ? 'inset 0 0 16px rgba(0,0,0,0.62), 0 0 12px rgba(250,204,21,0.15), 0 0 40px rgba(250,204,21,0.05)'
            : 'inset 0 0 16px rgba(0,0,0,0.62)',
        }}>{active.tier}</div>

        {carry && (
          <div className="cd-carry-big">
            <HexagonFrame color={cfg.color} bg={COST_BG[carry.cost]} size={120} padding={3}>
              <ChampionAvatar id={carry.id} name={carry.name} icon={carry.icon || undefined} shape="hexagon" className="w-[110px] h-[110px]" />
            </HexagonFrame>
          </div>
        )}

        <h2 className="cd-comp-name">{active.name}</h2>
        <p className="cd-playstyle">PLAYSTYLE: {active.playstyle || active.difficulty} ({active.difficulty})</p>

        {allVariants.length > 1 && (
          <div className="cd-variant-tabs">
            {allVariants.map((v, idx) => (
              <button key={idx} className={`cd-variant-btn ${activeVariantIdx === idx ? 'active' : ''}`}
                style={activeVariantIdx === idx ? { color: cfg.color, borderColor: `${cfg.color}66` } : {}}
                onClick={() => setActiveVariantIdx(idx)}>
                {v.variant_label || v.name.split(' ').slice(-1)[0]} {idx > 0 && idx === activeVariantIdx ? '' : idx === 0 ? '(Main)' : ''}
              </button>
            ))}
          </div>
        )}

        {/* Traits */}
        {dbTraits.length > 0 && (
          <div>
            <div className="flex flex-wrap gap-x-2 gap-y-3">
              {dbTraits.map((t) => (
                <TraitBadge key={t.name} t={t} traitsDb={traitsDb} />
              ))}
            </div>
          </div>
        )}

        {/* Augments */}
        {active.augments && active.augments.length > 0 && (
          <div className="cd-augments-section">
            <div className="cd-section-title">Augments</div>
            <div className="cd-augment-grid">
              {active.augments.map((aug: string, i: number) => (
                <div key={i} className="cd-augment-item">
                  <GameIcon type="augment" id={aug} icon={augments?.find(a => a.name === aug)?.icon} className="w-full h-full" alt={aug} scale={1} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Augment Priority */}
        {active.augment_priority && active.augment_priority.length > 0 && (
          <div className="cd-aug-prio">
            <div className="cd-section-title">Augment Priority</div>
            <div className="cd-prio-tags">
              {(active.augment_priority as string[]).map((tag, i) => (
                <span key={tag} className="cd-prio-tag">
                  {i > 0 && <span className="cd-prio-arrow">▸</span>}
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right Panel ── */}
      <div className="cd-right">
        <button onClick={onClose} className="cd-close-btn">✕</button>

        {/* Champion Row Header */}
        <div className="cd-champ-row">
          {champList.map((cc, i) => {
            const c = champMap[cc.id];
            if (!c) return null;
            return (
              <div key={i} className="cd-champ-unit">
                <HexagonFrame color={cc.is_carry ? cfg.color : COST_COLORS[c.cost]} bg={COST_BG[c.cost]} size={58} padding={2}>
                  <ChampionAvatar id={c.id} name={c.name} icon={c.icon || undefined} shape="hexagon" className="w-[50px] h-[50px]" />
                </HexagonFrame>
              </div>
            );
          })}
        </div>

        <div className="cd-content-scroll">
          {/* Row 1: Early / Item / Flex */}
          <div className="cd-grid-3">
            <div className="cd-box">
              <div className="cd-box-title">Early Units</div>
              <div className="cd-info-avatars">
                {(active.early_units || []).map((id: string) => {
                  const c = champMap[id];
                  return c ? (
                    <HexagonFrame key={id} color={COST_COLORS[c.cost]} bg={COST_BG[c.cost]} size={48} padding={1.5}>
                      <ChampionAvatar id={c.id} name={c.name} icon={c.icon || undefined} shape="hexagon" className="w-[42px] h-[42px]" />
                    </HexagonFrame>
                  ) : null;
                })}
              </div>
            </div>
            
            <div className="cd-box">
              <div className="cd-box-title">Item Priority</div>
              <div className="cd-info-items">
                {(active.item_priority || []).map((itemId: string, idx: number) => {
                  const url = getItemImageUrl(itemMap[itemId]?.icon || itemId);
                  return url ? (
                    <div key={idx} className="cd-item-icon">
                      <img src={url} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                    </div>
                  ) : (
                    <div key={idx} className="cd-item-icon cd-item-empty" />
                  );
                })}
              </div>
            </div>

            <div className="cd-box">
              <div className="cd-box-title">Flex Units</div>
              <div className="cd-info-avatars">
                {(active.flex_units || []).map((id: string) => {
                  const c = champMap[id];
                  return c ? (
                    <HexagonFrame key={id} color={COST_COLORS[c.cost]} bg={COST_BG[c.cost]} size={48} padding={1.5}>
                      <ChampionAvatar id={c.id} name={c.name} icon={c.icon || undefined} shape="hexagon" className="w-[42px] h-[42px]" />
                    </HexagonFrame>
                  ) : null;
                })}
              </div>
            </div>
          </div>

          {/* Row 2: Board / Alt Builds */}
          <div className="cd-grid-2">
            <div className="cd-box">
              <div className="cd-box-title">Positioning Example</div>
              <div className="cd-hex-board">
                {[0, 1, 2, 3].map(row => (
                  <div key={row} className={`cd-hex-r ${row % 2 === 1 ? 'offset' : ''}`}>
                    {[0, 1, 2, 3, 4, 5, 6].map(col => {
                      const pos = (active.board_positions as BoardPos[])?.find(p => p.row === row && p.col === col);
                      const champ = pos ? champMap[pos.champion_id] : null;
                      const cc = pos ? (active.champions as CompChamp[])?.find(c => c.id === pos.champion_id) : null;
                      return (
                        <div 
                          key={col} 
                          className={`cd-hex ${champ ? 'has-unit' : ''}`}
                        >
                          {champ ? (
                            <>
                              <HexagonFrame color={COST_COLORS[champ.cost] || '#fff'} bg="#121A2B" size={72} padding={3}>
                                <div style={{ width: '100%', height: '100%', display: 'flex' }}>
                                  <ChampionAvatar id={champ.id} name={champ.name} icon={champ.icon || undefined} shape="hexagon" className="w-full h-full" />
                                </div>
                              </HexagonFrame>
                              {cc?.star && cc.star > 1 && (
                                <div style={{ position: 'absolute', top: '-6px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '0', zIndex: 15, pointerEvents: 'none' }}>
                                  {Array.from({ length: cc.star }, (_, i) => (
                                    <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '12px', height: '12px', color: cc.star === 3 ? '#facc15' : '#d1d5db', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,1))' }}>
                                      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                                    </svg>
                                  ))}
                                </div>
                              )}
                              {cc?.items && cc.items.length > 0 && (
                                <div style={{ position: 'absolute', bottom: '4px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '1px', zIndex: 15 }}>
                                  {cc.items.map((itemId, ii) => {
                                    const altUrl = getItemImageUrl(itemMap[itemId]?.icon || itemId);
                                    return altUrl ? (
                                      <img key={ii} src={altUrl} alt="" className="w-[18px] h-[18px] rounded-[2px] border border-white/30 bg-black object-cover drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" crossOrigin="anonymous" />
                                    ) : null;
                                  })}
                                </div>
                              )}
                            </>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {(active.alt_builds as AltBuild[])?.length > 0 && (
              <div className="cd-box">
                <div className="cd-box-title">Alt Builds</div>
                {(active.alt_builds as AltBuild[]).map((ab, idx) => {
                  const altCarry = champMap[ab.carry_id];
                  return (
                    <div key={idx} className="cd-alt-build">
                      {altCarry && (
                        <HexagonFrame color={COST_COLORS[altCarry.cost]} bg={COST_BG[altCarry.cost]} size={44} padding={1.5}>
                          <ChampionAvatar id={altCarry.id} name={altCarry.name} icon={altCarry.icon || undefined} shape="hexagon" className="w-[38px] h-[38px]" />
                        </HexagonFrame>
                      )}
                      <div className="cd-alt-items">
                        {(ab.items || []).map((itemId, ii) => {
                          const altUrl = getItemImageUrl(itemMap[itemId]?.icon || itemId);
                          return altUrl ? <img key={ii} src={altUrl} alt="" className="cd-alt-item-img" crossOrigin="anonymous" /> : null;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* Tips */}
          {active.tips && (
            <div className="cd-box">
              <div className="cd-box-title">Tips</div>
              <p className="cd-tips-text">{active.tips}</p>
            </div>
          )}

          {/* Stage Plans */}
          {stagePlans.length > 0 && (
            <div className="cd-grid-3">
              {stagePlans.map((sp, i) => (
                <div key={i} className="cd-box" style={{ padding: '2rem 1rem 1rem', marginTop: '0.5rem' }}>
                  <div className="cd-stage-label">{sp.stage}</div>
                  <p className="cd-stage-text">{sp.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Open in Builder */}
          <div className="cd-footer">
            <label className="cd-show-names">
              Show names
              <div className="cd-toggle"></div>
            </label>
            <Link href={`/builder?comp=${encodeURIComponent(JSON.stringify({ champions: active.champions, board_positions: active.board_positions, augments: active.augments, name: active.name }))}`} className="cd-builder-link">
              Open in builder <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────
export function CompsTierlistClient({ comps, traitsMap, champions, items, augments = [], traitsDb = [] }: {
  comps: CuratedComp[];
  traitsMap: Record<string, string[]>;
  champions: ChampionData[];
  items: ItemData[];
  augments?: any[];
  traitsDb?: any[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const champMap = useMemo(() => {
    const m: Record<string, ChampionData> = {};
    champions.forEach(c => { m[c.id] = c; });
    return m;
  }, [champions]);

  const itemMap = useMemo(() => {
    const m: Record<string, ItemData> = {};
    items.forEach(i => { m[i.id] = i; });
    return m;
  }, [items]);

  const filtered = comps.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const isLoading = false;

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
              <span className="text-3xl">📜</span>
              COMPS <span className="text-[var(--color-pumpkin)]">▸</span>{' '}
              <span className="gradient-text">TIERLIST</span>
            </h1>
          </div>
          <input type="text" placeholder="Search comps..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="arcane-input px-4 py-2 text-sm placeholder:text-[var(--color-text-muted)] transition-colors w-48" />
        </div>

        {/* Tabs */}
        <div className="arcane-tab-row flex gap-1 mb-8">
          {TABS.map(tab => (
            <Link key={tab.label} href={tab.href} aria-current={tab.active ? 'page' : undefined} className={`arcane-tab px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab.active ? 'border-transparent text-[var(--color-pumpkin)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`}>
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Tier Rows */}
        <div className="space-y-6">
          {TIERS.map(tier => {
            const tierComps = filtered.filter(c => c.tier === tier);
            const cfg = TIER_CONFIG[tier];
            if (tierComps.length === 0 && !isLoading) return null;

            return (
              <div key={tier} className="flex flex-col gap-2">
                <motion.div className="tierlist-row" style={tierRowStyle(tier, cfg)}>
                  <div className="tier-label-cell" style={{ borderColor: tier === 'S' ? 'rgba(250,204,21,0.16)' : 'rgba(255,255,255,0.05)', background: `linear-gradient(175deg, ${cfg.bg}, rgba(10,15,31,0.42) 72%)` }}>
                    <span className="tier-letter" data-tier={tier} style={tierLetterStyle(tier, cfg)}>{tier}</span>
                    <span className="tier-sub" style={{ color: cfg.color }}>TIER</span>
                  </div>
                  <div className="tier-comps-cell">
                    {isLoading ? (
                      <div className="w-full flex justify-center text-white/30 text-sm animate-pulse">Loading...</div>
                    ) : tierComps.length === 0 ? (
                      <div className="w-full text-center text-white/30 text-xs">No comps</div>
                    ) : tierComps.map(comp => (
                      <CompCard key={comp.id} comp={comp} champMap={champMap} isSelected={expandedId === comp.id}
                        onClick={() => setExpandedId(expandedId === comp.id ? null : comp.id)} />
                    ))}
                  </div>
                </motion.div>

                <AnimatePresence mode="sync">
                  {expandedId && tierComps.some(c => c.id === expandedId) && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <CompDetails comp={tierComps.find(c => c.id === expandedId)!} traitsMap={traitsMap}
                        champMap={champMap} itemMap={itemMap} augments={augments} traitsDb={traitsDb} onClose={() => setExpandedId(null)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .tierlist-row { display: flex; align-items: stretch; gap: 0; border-radius: 8px; border: 1px solid; min-height: 110px; overflow: hidden; backdrop-filter: blur(18px); transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease; }
        .tierlist-row:hover { border-color: rgba(250,204,21,0.16) !important; box-shadow: inset 0 0 40px rgba(0,0,0,0.7), 0 10px 40px rgba(0,0,0,0.6), 0 0 16px rgba(250,204,21,0.08) !important; }
        .tier-label-cell { flex-shrink: 0; width: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1rem 0; border-right: 1px solid; }
        .tier-letter { font-size: 2.5rem; font-weight: 800; font-family: 'Cinzel', serif; line-height: 1; letter-spacing: 0.08em; }
        .tier-letter[data-tier="S"] { font-size: 2.8rem; }
        .tier-sub { font-size: 0.6rem; font-weight: 500; letter-spacing: 0.2em; opacity: 0.56; }
        .tier-comps-cell { flex: 1; display: flex; align-items: center; gap: 0.75rem; padding: 1rem; overflow-x: auto; }

        .comp-card-btn { position: relative; cursor: pointer; background: none; border: none; transition: transform 0.2s; flex-shrink: 0; }
        .comp-card-btn:hover, .comp-card-btn.selected { transform: scale(1.12); }
        .comp-card-btn.selected { filter: drop-shadow(0 0 10px rgba(250,204,21,0.12)); }
        .comp-card-hex { position: relative; }
        .comp-card-carry-badge { position: absolute; top: -4px; right: -4px; width: 18px; height: 18px; background: #0A0F1F; border-radius: 50%; border: 2px solid; display: flex; align-items: center; justify-content: center; font-size: 8px; z-index: 10; }
        .comp-card-arrow { position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 8px solid #D4AF37; }
        .comp-card-placeholder { width: 68px; height: 68px; display: flex; align-items: center; justify-content: center; border: 2px solid; border-radius: 12px; font-size: 1.5rem; color: #fff; }

        /* Detail panel */
        .comp-detail { display: flex; flex-direction: row; border-radius: 8px; border: 1px solid; overflow: hidden; background: linear-gradient(162deg, rgba(255,255,255,0.032), rgba(255,255,255,0) 34%), #0C1222; margin-top: 4px; }
        
        /* Left Panel */
        .cd-left { width: 280px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; border-right: 1px solid rgba(255,255,255,0.08); padding-bottom: 2rem; position: relative; }
        .cd-left-top-bg { position: absolute; top: 0; left: 0; right: 0; height: 140px; z-index: 0; border-bottom-left-radius: 50%; border-bottom-right-radius: 50%; }
        .cd-tier-badge { position: relative; z-index: 1; width: 44px; height: 44px; margin-top: 1.5rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; color: #FACC15; border-radius: 8px; font-family: 'Cinzel', serif; background: rgba(10,15,31,0.62); border: 1px solid; }
        
        .cd-carry-big { position: relative; z-index: 1; margin-top: 1rem; margin-bottom: 1rem; }
        .cd-comp-name { position: relative; z-index: 1; font-size: 1.25rem; font-weight: 800; color: #F8FAFC; text-align: center; text-transform: uppercase; letter-spacing: 0.06em; margin: 0.25rem 0; font-family: 'Cinzel', serif; }
        .cd-playstyle { position: relative; z-index: 1; font-size: 0.65rem; color: #D8C8A4; text-transform: uppercase; font-weight: 600; letter-spacing: 0.08em; margin-bottom: 1.25rem; text-align: center; }

        /* Variants */
        .cd-variant-tabs { display: flex; gap: 0.35rem; flex-wrap: wrap; justify-content: center; margin-bottom: 0.5rem; position: relative; z-index: 1; }
        .cd-variant-btn { padding: 0.3rem 0.6rem; border-radius: 999px; font-size: 0.65rem; font-weight: 700; color: #C9D3E3; border: 1px solid rgba(255,255,255,0.08); background: rgba(10,15,31,0.34); cursor: pointer; }
        .cd-variant-btn.active { background: rgba(250,204,21,0.08); }

        .cd-traits { display: flex; flex-wrap: wrap; gap: 0.35rem; justify-content: center; margin-bottom: 1.5rem; padding: 0 1rem; position: relative; z-index: 1; }
        .cd-trait-chip { display: flex; align-items: center; gap: 4px; padding: 0.2rem 0.5rem; border-radius: 4px; background: #dd9933; color: #000; font-weight: 800; font-size: 0.75rem; }
        .cd-trait-icon { width: 14px; height: 14px; filter: brightness(0); }

        .cd-section-title { font-size: 0.85rem; font-weight: 700; color: #D4AF37; margin-bottom: 0.5rem; text-align: center; letter-spacing: 0.04em; }
        
        .cd-augments-section { margin-bottom: 1.5rem; display: flex; flex-direction: column; align-items: center; }
        .cd-augment-grid { display: flex; flex-wrap: wrap; gap: 0.4rem; justify-content: center; padding: 0 1rem; max-width: 220px; }
        .cd-augment-item { width: 36px; height: 36px; }

        .cd-aug-prio { display: flex; flex-direction: column; align-items: center; }
        .cd-prio-tags { display: flex; align-items: center; justify-content: center; gap: 0.5rem; flex-wrap: wrap; }
        .cd-prio-tag { font-size: 0.75rem; font-weight: 700; color: #F8FAFC; background: rgba(255,255,255,0.055); border: 1px solid rgba(250,204,21,0.14); padding: 0.25rem 0.75rem; border-radius: 999px; display: inline-flex; align-items: center; gap: 0.3rem; }
        .cd-prio-arrow { color: rgba(255,255,255,0.4); font-size: 0.9rem; margin: 0 -2px; }

        /* Right panel */
        .cd-right { flex: 1; display: flex; flex-direction: column; background: #0C1222; position: relative; }
        .cd-close-btn { position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; border-radius: 4px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; transition: background 0.2s; z-index: 10; }
        .cd-close-btn:hover { background: rgba(255,255,255,0.15); }

        /* Champs Header Row */
        .cd-champ-row { display: flex; gap: 0.3rem; padding: 1.25rem 1rem 1rem 1.5rem; flex-wrap: wrap; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(10,15,31,0.24); min-height: 80px; align-items: center; }
        .cd-champ-unit { display: flex; flex-direction: column; align-items: center; gap: 2px; }

        .cd-content-scroll { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; overflow-y: auto; }

        /* Box Layouts (overlapping titles) */
        .cd-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        .cd-grid-2 { display: grid; grid-template-columns: 1fr 120px; gap: 1.5rem; }

        .cd-box { position: relative; border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 1.5rem 1rem 1rem; background: linear-gradient(180deg, rgba(255,255,255,0.026), rgba(255,255,255,0)), rgba(7,11,22,0.38); box-shadow: inset 0 0 28px rgba(0,0,0,0.45), 0 8px 22px rgba(0,0,0,0.28); }
        .cd-box-title { position: absolute; top: 0; left: 50%; transform: translate(-50%, -50%); background: #121A2B; padding: 0 12px; font-size: 0.9rem; font-weight: 700; color: #D4AF37; white-space: nowrap; border-radius: 4px; }
        
        .cd-info-avatars { display: flex; gap: 0.4rem; justify-content: center; flex-wrap: wrap; }
        .cd-info-items { display: flex; gap: 0.4rem; justify-content: center; }
        .cd-item-icon { width: 32px; height: 32px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); overflow: hidden; background: #000; }
        .cd-item-empty { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }

        .cd-board-section { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 0.75rem; }
        .cd-hex-board { display: flex; flex-direction: column; padding-top: 10px; padding-bottom: 10px; align-items: center; }
        .cd-hex-r { display: flex; gap: 4px; justify-content: center; margin-top: -14px; }
        .cd-hex-r:first-child { margin-top: 0; }
        .cd-hex-r.offset { transform: translateX(35px); } /* 66 width + 4 gap = 70. Half is 35 */
        .cd-hex { 
          width: 66px; 
          height: 72px; 
          background: rgba(255,255,255,0.05); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          position: relative;
        }
        .cd-hex.has-unit { background: transparent; clip-path: none; }
        .cd-hex.has-unit::before { display: none; }
        
        /* Create pseudo-element to act as border inside the clip-path for EMPTY cells */
        .cd-hex::before {
          content: "";
          position: absolute;
          inset: 1px;
          background: #121A2B;
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          z-index: 0;
        }
        .cd-hex > * { position: relative; z-index: 1; }

        .cd-alt-build { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
        .cd-alt-items { display: flex; gap: 4px; }
        .cd-alt-item-img { width: 24px; height: 24px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); }

        .cd-tips-text { font-size: 0.95rem; color: rgba(255,255,255,0.9); line-height: 1.6; margin: 0; padding: 1.5rem 0 0.5rem; text-align: center; }

        .cd-stage-label { position: absolute; top: 0; left: 50%; transform: translate(-50%, -50%); background: #121A2B; padding: 0 12px; border: 1px solid rgba(250,204,21,0.18); border-radius: 999px; font-size: 0.8rem; font-weight: 800; color: #D4AF37; }
        .cd-stage-text { font-size: 0.9rem; color: rgba(255,255,255,0.8); line-height: 1.6; margin: 0; padding: 1.5rem 0 0.5rem; text-align: center; }

        .cd-footer { margin-top: 1rem; display: flex; justify-content: flex-end; gap: 1rem; align-items: center; }
        .cd-show-names { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #fff; font-weight: 600; cursor: pointer; }
        .cd-toggle { width: 36px; height: 20px; background: #D4AF37; border-radius: 10px; position: relative; }
        .cd-toggle::after { content: ''; position: absolute; width: 16px; height: 16px; background: #fff; border-radius: 50%; top: 2px; right: 2px; }
        .cd-builder-link { font-size: 0.85rem; font-weight: 700; color: #F8FAFC; text-decoration: none; padding: 0.5rem 1.25rem; border: 1px solid rgba(212,175,55,0.42); border-radius: 999px; display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s; }
        .cd-builder-link:hover { background: rgba(250,204,21,0.08); }

        @media (max-width: 900px) {
           .cd-grid-3 { grid-template-columns: 1fr; gap: 2rem; }
           .cd-grid-2 { grid-template-columns: 1fr; gap: 2rem; }
        }
        @media (max-width: 768px) {
          .comp-detail { flex-direction: column; }
          .cd-left { width: 100%; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.08); }
        }
      `}</style>
    </div>
  );
}
