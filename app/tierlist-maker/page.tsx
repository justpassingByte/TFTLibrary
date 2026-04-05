'use client';

import { useState, useMemo, type DragEvent } from 'react';
import {
  ALL_CHAMPIONS, ITEMS, COST_COLORS, COST_BG, TIER_CONFIG,
  type BuilderChampion, type TierRow, type ItemDef, type ItemCategory
} from '../builder/builder-data';
import { ChampionAvatar, HexagonFrame } from '@/components/ui/champion-avatar';
import { getItemImageUrl } from '@/lib/riot-cdn';
import { SpriteIcon } from '@/components/ui/sprite-icon';

type SortMode = 'Cost' | 'Name' | 'Origin' | 'Class';
type ToolboxTab = 'Champions' | 'Traits' | 'Augments' | 'Items';

import { ALL_AUGMENTS } from '../builder/builder-data';

const RARITY_COLORS: Record<string, string> = {
  Silver: '#9ca3af', Gold: '#fbbf24', Prismatic: '#c084fc',
};

// Drag payload
interface DragPayload {
  type: 'champion' | 'tier-node' | 'augment' | 'item';
  championId?: string;
  fromTier?: string;
  fromIdx?: number;
  augmentName?: string;
  itemId?: string;
}
let currentDrag: DragPayload | null = null;

// eslint-disable-next-line react-hooks/exhaustive-deps
/* eslint-disable react-hooks/globals */
export default function TierlistMakerPage() {
  const [tiers, setTiers] = useState<TierRow[]>(
    TIER_CONFIG.map(t => ({ label: t.label, color: t.color, nodes: [] }))
  );
  const [tierTitle, setTierTitle] = useState('YOUR TITLE');
  const [isViewMode, setIsViewMode] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('Cost');
  const [toolboxTab, setToolboxTab] = useState<ToolboxTab>('Champions');
  const [itemTab, setItemTab] = useState<ItemCategory>('Completed');
  const [augmentTab, setAugmentTab] = useState<'Silver' | 'Gold' | 'Prismatic'>('Silver');
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // Unique traits
  const allTraits = useMemo(() => {
    const s = new Set<string>();
    ALL_CHAMPIONS.forEach(c => c.traits.forEach(t => s.add(t)));
    return [...s].sort();
  }, []);

  const filteredChampions = useMemo(() => {
    let list = [...ALL_CHAMPIONS];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.traits.some(t => t.toLowerCase().includes(q))
      );
    }
    switch (sortMode) {
      case 'Cost': list.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)); break;
      case 'Name': list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'Origin': list.sort((a, b) => (a.traits[0] || '').localeCompare(b.traits[0] || '') || a.cost - b.cost); break;
      case 'Class': list.sort((a, b) => (a.traits[1] || '').localeCompare(b.traits[1] || '') || a.cost - b.cost); break;
    }
    return list;
  }, [searchQuery, sortMode]);

  const filteredItems = useMemo(() => ITEMS.filter(i => i.category === itemTab), [itemTab]);
  const filteredAugments = useMemo(() => ALL_AUGMENTS.filter(a => a.rarity === augmentTab), [augmentTab]);

  const placedIds = useMemo(() => {
    const ids = new Set<string>();
    tiers.forEach(t => t.nodes.forEach(c => ids.add(c.id)));
    return ids;
  }, [tiers]);

  // ── Drag Handlers ──
  const onDragStartChampion = (e: DragEvent, champ: BuilderChampion) => {
    currentDrag = { type: 'champion', championId: champ.id };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', champ.id);
  };

  const onDragStartTierNode = (e: DragEvent, tierLabel: string, idx: number) => {
    currentDrag = { type: 'tier-node', fromTier: tierLabel, fromIdx: idx };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `tier-${tierLabel}-${idx}`);
  };

  const onDropTier = (e: DragEvent, tierLabel: string) => {
    e.preventDefault();
    setDragOverTarget(null);
    if (!currentDrag) return;

    if (currentDrag.type === 'champion') {
      const champ = ALL_CHAMPIONS.find(c => c.id === currentDrag!.championId);
      if (!champ) return;
      setTiers(prev => prev.map(t =>
        t.label === tierLabel ? { ...t, nodes: [...t.nodes, { type: 'champion', id: champ.id, data: champ }] } : t
      ));
    } else if (currentDrag.type === 'augment') {
      const aug = ALL_AUGMENTS.find(a => a.name === currentDrag!.augmentName);
      if (!aug) return;
      setTiers(prev => prev.map(t =>
        t.label === tierLabel ? { ...t, nodes: [...t.nodes, { type: 'augment', id: aug.id, data: aug }] } : t
      ));
    } else if (currentDrag.type === 'item') {
      const item = ITEMS.find(i => i.id === currentDrag!.itemId);
      if (!item) return;
      setTiers(prev => prev.map(t =>
        t.label === tierLabel ? { ...t, nodes: [...t.nodes, { type: 'item', id: item.id, data: item }] } : t
      ));
    } else if (currentDrag.type === 'tier-node') {
      setTiers(prev => {
        const next = prev.map(t => ({ ...t, nodes: [...t.nodes] }));
        const from = next.find(t => t.label === currentDrag!.fromTier);
        const to = next.find(t => t.label === tierLabel);
        if (from && to) {
          const [moved] = from.nodes.splice(currentDrag!.fromIdx!, 1);
          if (moved) to.nodes.push(moved);
        }
        return next;
      });
    }
    currentDrag = null;
  };

  const onDragOver = (e: DragEvent, target: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget(target);
  };

  const removeFromTier = (tierLabel: string, idx: number) => {
    setTiers(prev => prev.map(t =>
      t.label === tierLabel ? { ...t, nodes: t.nodes.filter((_, i) => i !== idx) } : t
    ));
  };

  const clearAll = () => {
    setTiers(TIER_CONFIG.map(t => ({ label: t.label, color: t.color, nodes: [] })));
  };

  const addRow = () => {
    const labels = ['D', 'E', 'F', 'G', 'H'];
    const nextLabel = labels.find(l => !tiers.some(t => t.label === l)) || `T${tiers.length + 1}`;
    const colors = ['#60a5fa', '#f472b6', '#a78bfa', '#34d399', '#f97316'];
    const color = colors[tiers.length % colors.length];
    setTiers(prev => [...prev, { label: nextLabel, color, nodes: [] }]);
  };

  const totalPlaced = tiers.reduce((s, t) => s + t.nodes.length, 0);

  return (
    <div className="min-h-screen pt-16 pb-4">
      <div className="max-w-[1440px] mx-auto px-3">

        {/* HEADER */}
        <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)] mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h1 className="gradient-text text-lg font-bold flex items-center gap-2" style={{ fontFamily: "'Cinzel', serif" }}>
              ⚔ TIERLIST
            </h1>
            <span className="text-[var(--color-text-muted)]">▸</span>
            <input
              value={tierTitle}
              onChange={e => setTierTitle(e.target.value)}
              className="bg-transparent border-b border-[var(--color-border)] text-sm text-[var(--color-text-primary)] font-bold focus:outline-none focus:border-[var(--color-pumpkin)] px-1 w-48"
              style={{ fontFamily: "'Cinzel', serif" }}
            />
          </div>
          <div className="flex items-center gap-2">
            {/* View/Build Toggle */}
            <div className="flex items-center gap-2 mr-2">
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">View Mode</span>
              <div
                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors duration-200 ${!isViewMode ? 'bg-[var(--color-pumpkin)]' : 'bg-[var(--color-grimoire-lighter)]'}`}
                onClick={() => setIsViewMode(!isViewMode)}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${!isViewMode ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-[10px] text-[var(--color-pumpkin)] uppercase tracking-wider font-bold">Build Mode</span>
            </div>
            <button onClick={addRow} className="px-3 py-1.5 rounded-lg bg-[var(--color-pumpkin)]/10 border border-[var(--color-pumpkin)]/30 text-xs font-medium text-[var(--color-pumpkin)] hover:bg-[var(--color-pumpkin)]/20 transition-colors">
              Add Row
            </button>
            <button onClick={clearAll} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-blood)] hover:border-[var(--color-blood)]/30 transition-colors">
              Clear All
            </button>
            <button className="px-3 py-1.5 rounded-lg bg-[var(--color-pumpkin)] text-black text-xs font-bold hover:brightness-110 transition-all">
              Share Tierlist
            </button>
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="flex gap-4 flex-col lg:flex-row">

          {/* LEFT: Tier Rows */}
          <div className="flex-1 min-w-0 space-y-2">
            {tiers.map(tier => {
              const cfg = TIER_CONFIG.find(t => t.label === tier.label);
              const tierColor = cfg?.color || tier.color;
              const tierBorder = cfg?.border || tier.color + '60';
              const tierBg = cfg?.bg || tier.color + '10';
              const isOver = dragOverTarget === `tier-${tier.label}`;

              return (
                <div
                  key={tier.label}
                  className="flex rounded-xl overflow-hidden transition-all"
                  style={{
                    border: `2px solid ${isOver ? tierColor : tierBorder}`,
                    boxShadow: isOver ? `0 0 24px ${tierColor}40, inset 0 0 24px ${tierColor}08` : `0 0 12px ${tierColor}15, inset 0 0 12px ${tierColor}05`,
                  }}
                >
                  {/* Tier Label */}
                  <div
                    className="w-16 flex-shrink-0 flex items-center justify-center relative"
                    style={{ backgroundColor: tierBg, borderRight: `2px solid ${tierBorder}` }}
                  >
                    <span className="text-2xl font-black" style={{ color: tierColor, fontFamily: "'Cinzel', serif", textShadow: `0 0 20px ${tierColor}50` }}>
                      {tier.label}
                    </span>
                  </div>

                  {/* Drop Zone */}
                  <div
                    className="flex-1 min-h-[72px] flex items-center gap-1.5 px-3 py-2 flex-wrap transition-colors"
                    style={{ backgroundColor: isOver ? `${tierColor}08` : 'var(--color-grimoire)' }}
                    onDragOver={e => !isViewMode && onDragOver(e, `tier-${tier.label}`)}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDrop={e => !isViewMode && onDropTier(e, tier.label)}
                  >
                    {tier.nodes.length === 0 && !isViewMode && (
                      <span className="text-xs text-[var(--color-text-muted)] italic px-2 opacity-50">
                        Drag entities here
                      </span>
                    )}
                    {tier.nodes.map((node, idx) => (
                      <div key={`${node.id}-${idx}`}
                        className="relative group flex flex-col items-center"
                        draggable={!isViewMode}
                        onDragStart={e => onDragStartTierNode(e, tier.label, idx)}
                        style={{ cursor: isViewMode ? 'default' : 'grab' }}
                      >
                        {node.type === 'champion' && (
                          <HexagonFrame color={COST_COLORS[node.data.cost]} bg={COST_BG[node.data.cost]} size={52} padding={2} className="shadow-lg transition-transform hover:scale-110">
                            <ChampionAvatar name={node.data.name} shape="hexagon" className="w-[44px] h-[48px] pointer-events-none" />
                            <span className="absolute top-1 left-2 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold z-10"
                              style={{ backgroundColor: COST_COLORS[node.data.cost], color: '#000' }}>
                              {node.data.cost}
                            </span>
                          </HexagonFrame>
                        )}
                        {node.type === 'item' && (
                          <div className="w-12 h-12 rounded-lg border border-[var(--color-border)] bg-[var(--color-grimoire-light)] flex items-center justify-center transition-transform hover:scale-110 shadow-lg">
                            <SpriteIcon type="item" id={node.id} className="w-[85%] h-[85%] pointer-events-none drop-shadow-md" alt={node.data.name} />
                          </div>
                        )}
                        {node.type === 'augment' && (
                          <div className="w-12 h-12 flex items-center justify-center transition-transform hover:scale-110 shadow-lg drop-shadow-md relative">
                            <SpriteIcon type="augment" id={node.id} className="w-full h-full object-contain pointer-events-none" alt={node.data.name} />
                          </div>
                        )}

                        {!isViewMode && (
                          <button onClick={() => removeFromTier(tier.label, idx)}
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600/80 text-white text-[7px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            ✕
                          </button>
                        )}
                        <span className="text-[7px] text-[var(--color-text-muted)] mt-0.5 max-w-[48px] truncate text-center">{node.data.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT: Toolbox */}
          {!isViewMode && (
            <div className="lg:w-72 flex-shrink-0">
              <div className="grimoire-card p-3 sticky top-20">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[11px] font-bold text-[var(--color-pumpkin)] uppercase tracking-widest">Toolbox</h2>
                  <span className="text-[9px] text-[var(--color-text-muted)]">{totalPlaced} placed</span>
                </div>

                {/* Tabs */}
                <div className="flex gap-0.5 mb-3 bg-[var(--color-grimoire-light)] rounded-lg p-0.5">
                  {(['Champions', 'Traits', 'Augments', 'Items'] as const).map(tab => (
                    <button key={tab} onClick={() => setToolboxTab(tab)}
                      className={`flex-1 px-1 py-1.5 text-[9px] font-medium rounded-md transition-colors ${toolboxTab === tab ? 'bg-[var(--color-pumpkin)] text-black' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`}>
                      {tab}
                    </button>
                  ))}
                </div>

                {toolboxTab === 'Champions' && (
                  <>
                    <div className="relative mb-2">
                      <input type="text" placeholder="Search by name/recipe..."
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--color-grimoire-light)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-pumpkin)] transition-colors" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-[var(--color-text-muted)] bg-[var(--color-grimoire-lighter)] px-1 py-0.5 rounded">Ctrl K</span>
                    </div>
                    <div className="flex gap-0.5 mb-3 bg-[var(--color-grimoire-light)] rounded-lg p-0.5">
                      {(['Cost', 'Name', 'Origin', 'Class'] as const).map(m => (
                        <button key={m} onClick={() => setSortMode(m)}
                          className={`flex-1 px-1 py-1 text-[9px] font-medium rounded-md transition-colors ${sortMode === m ? 'bg-[var(--color-pumpkin)] text-black' : 'text-[var(--color-text-muted)]'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 max-h-[55vh] overflow-y-auto show-scrollbar pr-1">
                      {filteredChampions.map(champ => {
                        const used = placedIds.has(champ.id);
                        return (
                          <div key={champ.id} draggable onDragStart={e => onDragStartChampion(e, champ)}
                            className={`relative flex flex-col items-center cursor-grab group transition-all ${used ? 'opacity-35' : 'hover:scale-105'}`}>
                            <HexagonFrame color={COST_COLORS[champ.cost]} bg={COST_BG[champ.cost]} size={48} padding={2} className="shadow-md">
                              <ChampionAvatar name={champ.name} shape="hexagon" className="w-[40px] h-[44px] pointer-events-none" />
                            </HexagonFrame>
                            <span className="text-[7px] text-[var(--color-text-muted)] mt-1 truncate max-w-[44px] text-center group-hover:text-[var(--color-text-secondary)]">{champ.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {toolboxTab === 'Traits' && (
                  <div className="space-y-1 max-h-[55vh] overflow-y-auto show-scrollbar pr-1">
                    {allTraits.map(trait => {
                      const champs = ALL_CHAMPIONS.filter(c => c.traits.includes(trait));
                      return (
                        <div key={trait} className="px-2 py-1.5 rounded-lg hover:bg-white/[0.02] transition-colors">
                          <span className="text-xs font-medium text-[var(--color-text-primary)]">{trait}</span>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {champs.map(c => (
                              <div key={c.id} draggable onDragStart={e => onDragStartChampion(e, c)}
                                className="cursor-grab hover:scale-110 transition-transform shadow-md"
                                title={c.name}>
                                <HexagonFrame color={COST_COLORS[c.cost]} bg={COST_BG[c.cost]} size={32} padding={1.5}>
                                  <ChampionAvatar name={c.name} shape="hexagon" className="w-[28px] h-[28px] pointer-events-none" />
                                </HexagonFrame>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {toolboxTab === 'Augments' && (
                  <>
                    <div className="flex gap-1 mb-3 bg-[var(--color-grimoire)] p-1 rounded-lg border border-[var(--color-border)] overflow-x-auto show-scrollbar pb-1">
                      {(['Silver', 'Gold', 'Prismatic'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setAugmentTab(tab)}
                          className={`flex-1 py-1 px-2 rounded-md text-[10px] font-bold uppercase transition-colors whitespace-nowrap ${
                            augmentTab === tab
                              ? 'bg-[var(--color-pumpkin)] text-black'
                              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/[0.05]'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1 max-h-[55vh] overflow-y-auto show-scrollbar pr-1">
                      {filteredAugments.map(aug => (
                        <div key={aug.name}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.02] transition-colors cursor-pointer"
                          draggable
                          onDragStart={e => { currentDrag = { type: 'augment', augmentName: aug.name }; e.dataTransfer.setData('text/plain', aug.name); }}>
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: RARITY_COLORS[aug.rarity] }} />
                          <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                            <SpriteIcon type="augment" id={aug.id} className="w-full h-full object-contain pointer-events-none drop-shadow-md" alt={aug.name} scale={1} />
                          </div>
                          <span className="text-xs text-[var(--color-text-primary)] flex-1 truncate">{aug.name}</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ color: RARITY_COLORS[aug.rarity], backgroundColor: RARITY_COLORS[aug.rarity] + '15', border: `1px solid ${RARITY_COLORS[aug.rarity]}30` }}>
                            {aug.rarity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {toolboxTab === 'Items' && (
                  <>
                    <div className="flex gap-0.5 mb-3 bg-[var(--color-grimoire-light)] rounded-lg p-0.5">
                      {(['Components', 'Completed', 'Artifacts', 'Emblems'] as const).map(tab => (
                        <button key={tab} onClick={() => setItemTab(tab)}
                          className={`flex-1 px-1 py-1 text-[8px] font-medium rounded-md transition-colors truncate ${itemTab === tab ? 'bg-[var(--color-pumpkin)] text-black' : 'text-[var(--color-text-muted)]'}`}>
                          {tab}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 max-h-[55vh] overflow-y-auto show-scrollbar pr-1">
                      {filteredItems.map(item => (
                        <div key={item.id}
                          className="group relative aspect-square rounded-lg border border-[var(--color-border)] bg-[var(--color-grimoire-light)] flex items-center justify-center hover:border-[var(--color-pumpkin)]/40 hover:bg-[var(--color-pumpkin)]/5 transition-all cursor-pointer overflow-hidden"
                          title={item.name}
                          draggable
                          onDragStart={e => { currentDrag = { type: 'item', itemId: item.id }; e.dataTransfer.setData('text/plain', item.id); }}>
                          {getItemImageUrl(item.id) ? (
                            <SpriteIcon type="item" id={item.id} className="w-[85%] h-[85%] pointer-events-none drop-shadow-md" alt={item.name} />
                          ) : (
                            <span className="text-[9px] font-bold text-[var(--color-text-muted)] text-center leading-tight px-0.5 group-hover:text-[var(--color-text-secondary)] transition-colors">
                              {item.name.length > 8 ? item.name.slice(0, 7) + '..' : item.name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
