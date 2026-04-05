'use client';

import { useState, useCallback, useMemo, type DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ALL_CHAMPIONS, ITEMS, COST_COLORS, COST_BG, BOARD_ROWS, BOARD_COLS, ALL_AUGMENTS,
  type BuilderChampion, type BoardCell, type ItemDef, type ItemCategory,
} from './builder-data';
import { ChampionAvatar, HexagonFrame } from '@/components/ui/champion-avatar';
import { getItemImageUrl, getAugmentImageUrl } from '@/lib/riot-cdn';
import { SpriteIcon } from '@/components/ui/sprite-icon';

// ============================================================
// Drag payload
// ============================================================
interface DragPayload {
  type: 'champion' | 'item' | 'board-champion';
  championId?: string;
  itemId?: string;
  fromRow?: number;
  fromCol?: number;
}
let currentDrag: DragPayload | null = null;

const RARITY_STYLES: Record<string, { border: string; bg: string; text: string }> = {
  Silver: { border: '#9ca3af', bg: 'rgba(156,163,175,0.08)', text: '#d1d5db' },
  Gold: { border: '#fbbf24', bg: 'rgba(251,191,36,0.08)', text: '#fbbf24' },
  Prismatic: { border: '#c084fc', bg: 'rgba(192,132,252,0.08)', text: '#c084fc' },
};

type SortMode = 'Cost' | 'Name' | 'Origin' | 'Class';
type RosterMode = 'Champions' | 'Items';

/* eslint-disable react-hooks/globals */
export default function BuilderPage() {
  const [board, setBoard] = useState<BoardCell[][]>(
    Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('Cost');
  const [showNames, setShowNames] = useState(true);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // Augment modal
  const [augModalOpen, setAugModalOpen] = useState(false);
  const [selectedAugments, setSelectedAugments] = useState<string[]>([]);
  const [augSearch, setAugSearch] = useState('');

  // Roster mode (bottom panel)
  const [rosterMode, setRosterMode] = useState<RosterMode>('Champions');
  const [itemTab, setItemTab] = useState<ItemCategory>('Components');

  // History
  const [history, setHistory] = useState<BoardCell[][][]>([]);

  // Active traits
  const activeTraits = useMemo(() => {
    const map: Record<string, number> = {};
    board.flat().forEach(cell => {
      if (cell) cell.champion.traits.forEach(t => { map[t] = (map[t] || 0) + 1; });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [board]);

  const placedCount = board.flat().filter(Boolean).length;

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

  const filteredItems = useMemo(() => {
    let list = ITEMS.filter(i => i.category === itemTab);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q));
    }
    return list;
  }, [itemTab, searchQuery]);

  const filteredAugments = useMemo(() => {
    if (!augSearch) return ALL_AUGMENTS;
    return ALL_AUGMENTS.filter(a => a.name.toLowerCase().includes(augSearch.toLowerCase()));
  }, [augSearch]);

  const pushHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-19), board.map(r => [...r])]);
  }, [board]);

  // ── Drag Handlers ──
  const onDragStartChampion = (e: DragEvent, champ: BuilderChampion) => {
    currentDrag = { type: 'champion', championId: champ.id };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', champ.id);
  };

  const onDragStartItem = (e: DragEvent, item: ItemDef) => {
    currentDrag = { type: 'item', itemId: item.id };
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', item.id);
  };

  const onDragStartBoardChamp = (e: DragEvent, row: number, col: number) => {
    currentDrag = { type: 'board-champion', fromRow: row, fromCol: col };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `board-${row}-${col}`);
  };

  const onDropBoard = (e: DragEvent, row: number, col: number) => {
    e.preventDefault();
    setDragOverTarget(null);
    if (!currentDrag) return;
    pushHistory();

    if (currentDrag.type === 'champion') {
      const champ = ALL_CHAMPIONS.find(c => c.id === currentDrag!.championId);
      if (!champ) return;
      setBoard(prev => {
        const next = prev.map(r => [...r]);
        next[row][col] = { champion: champ, items: [] };
        return next;
      });
    } else if (currentDrag.type === 'board-champion') {
      setBoard(prev => {
        const next = prev.map(r => [...r]);
        const src = next[currentDrag!.fromRow!][currentDrag!.fromCol!];
        next[currentDrag!.fromRow!][currentDrag!.fromCol!] = next[row][col];
        next[row][col] = src;
        return next;
      });
    } else if (currentDrag.type === 'item') {
      const cell = board[row][col];
      if (cell && cell.items.length < 3) {
        setBoard(prev => {
          const next = prev.map(r => [...r]);
          const unit = { ...next[row][col]! };
          unit.items = [...unit.items, currentDrag!.itemId!];
          next[row][col] = unit;
          return next;
        });
      }
    }
    currentDrag = null;
  };

  const onDragOver = (e: DragEvent, target: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget(target);
  };

  const clearBoard = () => {
    pushHistory();
    setBoard(Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null)));
    setSelectedAugments([]);
  };

  const undo = () => {
    if (history.length > 0) {
      setBoard(history[history.length - 1]);
      setHistory(h => h.slice(0, -1));
    }
  };

  const toggleAugment = (name: string) => {
    setSelectedAugments(prev =>
      prev.includes(name) ? prev.filter(a => a !== name) : prev.length < 3 ? [...prev, name] : prev
    );
  };

  const removeFromBoard = (row: number, col: number) => {
    pushHistory();
    setBoard(prev => {
      const next = prev.map(r => [...r]);
      next[row][col] = null;
      return next;
    });
  };

  const removeItemFromUnit = (row: number, col: number, itemIdx: number) => {
    setBoard(prev => {
      const next = prev.map(r => [...r]);
      const unit = { ...next[row][col]! };
      unit.items = unit.items.filter((_, i) => i !== itemIdx);
      next[row][col] = unit;
      return next;
    });
  };

  return (
    <div className="min-h-screen pt-16 pb-4">
      <div className="max-w-[1440px] mx-auto px-3">

        {/* TOP TOOLBAR */}
        <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)] mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <button className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-border-hover)] transition-colors">
              Set 16 ▾
            </button>
            <div className="w-px h-5 bg-[var(--color-border)]" />
            <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] cursor-pointer select-none">
              Names
              <div
                className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors duration-200 ${showNames ? 'bg-[var(--color-pumpkin)]' : 'bg-[var(--color-grimoire-lighter)]'}`}
                onClick={() => setShowNames(!showNames)}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${showNames ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </div>
            </label>
            <div className="w-px h-5 bg-[var(--color-border)]" />
            <button onClick={undo} disabled={history.length === 0}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${history.length > 0 ? 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed'}`}>
              Undo
            </button>
            <button onClick={clearBoard} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-blood)] hover:border-[var(--color-blood)]/30 transition-colors">
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-pumpkin)] hover:border-[var(--color-pumpkin)]/30 transition-colors">Save</button>
            <button className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-pumpkin)] hover:border-[var(--color-pumpkin)]/30 transition-colors">Share</button>
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="flex gap-3 flex-col lg:flex-row">

          {/* LEFT: Active Traits */}
          <div className="lg:w-52 flex-shrink-0">
            <div className="grimoire-card p-3 sticky top-20">
              {activeTraits.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] italic py-4 text-center">Place units to see traits</p>
              ) : (
                <div className="space-y-1">
                  {activeTraits.map(([trait, count]) => {
                    const isActive = count >= 2;
                    const isGold = count >= 4;
                    return (
                      <div key={trait} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                        style={{ backgroundColor: isGold ? 'rgba(255,215,0,0.08)' : isActive ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                        <span className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{ backgroundColor: isGold ? 'rgba(255,215,0,0.15)' : isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)', color: isGold ? 'var(--color-pumpkin)' : isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                          {count}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs font-medium truncate block ${isActive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}>{trait}</span>
                          <span className="text-[9px] text-[var(--color-text-muted)]">2 › 4 › 6</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                <span>Units <strong className="text-[var(--color-text-primary)]">{placedCount}</strong></span>
              </div>
            </div>
          </div>

          {/* CENTER: Hex Board */}
          <div className="flex-1">
            <div className="grimoire-card p-3 sm:p-4 relative overflow-hidden min-h-[340px]">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none select-none"
                style={{ fontFamily: "'Cinzel', serif", fontSize: '60px', fontWeight: 900, whiteSpace: 'nowrap', letterSpacing: '4px' }}>
                TFTGrimoire
              </div>

              <div className="flex flex-col items-center gap-[3px] py-6">
                {Array.from({ length: BOARD_ROWS }, (_, row) => (
                  <div key={row} className="flex gap-[3px]" style={{ marginLeft: row % 2 === 1 ? '36px' : '0' }}>
                    {Array.from({ length: BOARD_COLS }, (_, col) => {
                      const cell = board[row][col];
                      const hexId = `hex-${row}-${col}`;
                      const isOver = dragOverTarget === hexId;

                      return (
                        <div
                          key={`${row}-${col}`}
                          className="group relative"
                          style={{ width: '68px', height: '74px' }}
                          onDragOver={e => onDragOver(e, hexId)}
                          onDragLeave={() => setDragOverTarget(null)}
                          onDrop={e => onDropBoard(e, row, col)}
                          onClick={() => cell && removeFromBoard(row, col)}
                        >
                          <div className="absolute inset-0 transition-all"
                            style={{
                              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                              background: cell ? COST_COLORS[cell.champion.cost] + '30' : isOver ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)',
                            }} />
                          <div className="absolute inset-[2px] flex flex-col items-center justify-center transition-colors"
                            style={{
                              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                              background: cell ? `linear-gradient(160deg, ${COST_BG[cell.champion.cost]}, rgba(20,20,20,0.95))` : 'rgba(18,18,18,0.95)',
                            }}>
                            {cell ? (
                              <div className="flex flex-col items-center cursor-grab"
                                draggable onDragStart={e => onDragStartBoardChamp(e, row, col)}>
                                <ChampionAvatar name={cell.champion.name} shape="hexagon" className="w-[42px] h-[46px] shadow-md pointer-events-none" />
                                {showNames && <span className="text-[7px] text-[var(--color-text-muted)] mt-1 leading-none">{cell.champion.name}</span>}
                                {cell.items.length > 0 && (
                                  <div className="flex gap-0.5 mt-0.5">
                                    {cell.items.map((itemId, i) => (
                                      <span key={i}
                                        className="w-3.5 h-3.5 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                                        title={ITEMS.find(it => it.id === itemId)?.name}
                                        onClick={e => { e.stopPropagation(); removeItemFromUnit(row, col, i); }}>
                                        <img src={getItemImageUrl(itemId)} className="w-full h-full object-contain drop-shadow" alt="" />
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className={`text-xs transition-opacity ${isOver ? 'text-[var(--color-pumpkin)] opacity-80' : 'text-[var(--color-text-muted)] opacity-20 group-hover:opacity-50'}`}>+</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Augments only */}
          <div className="lg:w-56 flex-shrink-0">
            <div className="grimoire-card p-3 sticky top-20">
              <h3 className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-2">Augments</h3>
              <div className="space-y-1.5 mb-2">
                {[0, 1, 2].map(i => {
                  const aug = selectedAugments[i];
                  return (
                    <div key={i}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-colors cursor-pointer"
                      style={{
                        borderColor: aug ? RARITY_STYLES[ALL_AUGMENTS.find(a => a.name === aug)?.rarity || 'Silver'].border + '30' : 'var(--color-border)',
                        backgroundColor: aug ? RARITY_STYLES[ALL_AUGMENTS.find(a => a.name === aug)?.rarity || 'Silver'].bg : 'transparent',
                      }}
                      onClick={() => aug ? toggleAugment(aug) : setAugModalOpen(true)}>
                      {aug ? (
                        <>
                          <span className="text-xs text-[var(--color-text-secondary)] flex-1 truncate">{aug}</span>
                          <span className="text-[var(--color-text-muted)] text-[10px] hover:text-[var(--color-blood)]">✕</span>
                        </>
                      ) : (
                        <span className="text-xs text-[var(--color-text-muted)] flex-1 text-center">+</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM: Champions + Items Roster */}
        <div className="mt-3 grimoire-card p-3">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {/* Mode toggle: Champions / Items */}
            <div className="flex gap-0.5 bg-[var(--color-grimoire-light)] rounded-lg p-0.5">
              {(['Champions', 'Items'] as const).map(mode => (
                <button key={mode} onClick={() => setRosterMode(mode)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${rosterMode === mode ? 'bg-[var(--color-pumpkin)] text-black' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`}>
                  {mode === 'Champions' ? '⚔ Champions' : '🛡 Items'}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-[var(--color-border)]" />

            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <input type="text" placeholder={rosterMode === 'Champions' ? 'Search champions...' : 'Search items...'} value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-grimoire-light)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-pumpkin)] transition-colors" />
            </div>

            {/* Champion sort modes (only visible in Champions mode) */}
            {rosterMode === 'Champions' && (
              <div className="flex gap-0.5 bg-[var(--color-grimoire-light)] rounded-lg p-0.5">
                {(['Cost', 'Name', 'Origin', 'Class'] as const).map(mode => (
                  <button key={mode} onClick={() => setSortMode(mode)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${sortMode === mode ? 'bg-[var(--color-pumpkin)] text-black' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`}>
                    {mode}
                  </button>
                ))}
              </div>
            )}

            {/* Item category tabs (only visible in Items mode) */}
            {rosterMode === 'Items' && (
              <div className="flex gap-0.5 bg-[var(--color-grimoire-light)] rounded-lg p-0.5">
                {(['Components', 'Completed', 'Artifacts', 'Emblems'] as const).map(tab => (
                  <button key={tab} onClick={() => setItemTab(tab)}
                    className={`px-3 py-1.5 text-[10px] font-medium rounded-md transition-colors ${itemTab === tab ? 'bg-[var(--color-pumpkin)] text-black' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`}>
                    {tab}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Champions Grid */}
          {rosterMode === 'Champions' && (
            <div className="flex flex-wrap gap-1">
              {filteredChampions.map(champ => (
                <div key={champ.id}
                  draggable
                  onDragStart={e => onDragStartChampion(e, champ)}
                  className="relative flex flex-col items-center gap-0.5 cursor-grab group hover:scale-105 transition-transform">
                  <HexagonFrame color={COST_COLORS[champ.cost]} bg={COST_BG[champ.cost]} size={52} padding={2} className="shadow-lg">
                    <ChampionAvatar name={champ.name} shape="hexagon" className="w-[46px] h-[50px] shadow-2xl pointer-events-none" />
                  </HexagonFrame>
                  <span className="text-[8px] text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors max-w-[52px] truncate text-center mt-1">
                    {champ.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Items Grid */}
          {rosterMode === 'Items' && (
            <div className="flex flex-wrap gap-1.5">
              {filteredItems.map(item => (
                <div key={item.id}
                  draggable
                  onDragStart={e => onDragStartItem(e, item)}
                  className="group relative flex flex-col items-center gap-0.5 cursor-grab hover:scale-105 transition-transform"
                  title={item.name}>
                  <div className="w-[52px] h-[52px] rounded-lg border border-[var(--color-border)] bg-[var(--color-grimoire-light)] flex items-center justify-center group-hover:border-[var(--color-pumpkin)]/40 group-hover:bg-[var(--color-pumpkin)]/5 transition-all overflow-hidden">
                    <img src={getItemImageUrl(item.id)} alt={item.name} className="w-[40px] h-[40px] object-contain pointer-events-none drop-shadow-md" />
                  </div>
                  <span className="text-[8px] text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors max-w-[56px] truncate text-center">
                    {item.name}
                  </span>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <p className="text-xs text-[var(--color-text-muted)] italic py-4 w-full text-center">No items found</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AUGMENT MODAL */}
      <AnimatePresence>
        {augModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setAugModalOpen(false)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()} className="relative bg-[#1c1c22] rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col p-4 border border-[var(--color-border)] shadow-2xl">
              
              <div className="flex items-center justify-between mb-4">
                <div className="relative w-80 border border-[#40404a] rounded-full overflow-hidden bg-[#24242b]">
                  <input type="text" placeholder="Search for an augment..." value={augSearch} onChange={e => setAugSearch(e.target.value)} autoFocus
                    className="w-full px-4 py-2 bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none" />
                </div>
                <button onClick={() => setAugModalOpen(false)} className="text-sm font-bold text-white hover:text-gray-300 transition-colors">Close</button>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-bold text-white mb-2">Selected Augments ({selectedAugments.length}/3):</h3>
                <div className="min-h-[100px] border border-[#303038] bg-[#24242b] rounded-lg flex items-center p-3 gap-6">
                  {selectedAugments.map(name => {
                    const aug = ALL_AUGMENTS.find(a => a.name === name);
                    if (!aug) return null;
                    const style = RARITY_STYLES[aug.rarity];
                    return (
                      <div key={name} className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform" onClick={() => toggleAugment(name)}>
                        <SpriteIcon type="augment" id={aug.id} className="w-14 h-14" alt={aug.name} scale={56/48} />
                        <span className="text-[10px] text-white font-black uppercase tracking-wider mt-2 text-center">{aug.name}</span>
                      </div>
                    );
                  })}
                  {selectedAugments.length === 0 && <span className="text-sm text-gray-500 italic px-2">No augments selected</span>}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto show-scrollbar border border-[#303038] bg-[#24242b] rounded-lg p-5">
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-x-2 gap-y-8">
                  {filteredAugments.map(aug => {
                    const isSelected = selectedAugments.includes(aug.name);
                    const style = RARITY_STYLES[aug.rarity];
                    return (
                      <div key={aug.id} onClick={() => toggleAugment(aug.name)}
                        className={`flex flex-col items-center cursor-pointer transition-all ${isSelected ? 'opacity-30' : 'hover:scale-110'}`}
                        title={aug.desc}>
                        <div className="w-14 h-14 relative flex items-center justify-center mb-2">
                          <SpriteIcon type="augment" id={aug.id} className="w-full h-full" alt={aug.name} scale={56/48} />
                        </div>
                        <span className="text-[9px] font-black text-center leading-tight uppercase tracking-wide text-white">
                          {aug.name}
                        </span>
                      </div>
                    );
                  })}
                  {filteredAugments.length === 0 && <p className="text-sm text-gray-500 col-span-full text-center py-8">No augments found</p>}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
