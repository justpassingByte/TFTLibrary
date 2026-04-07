'use client';

import { useState, useEffect, useCallback, useMemo, useRef, type DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toPng } from 'html-to-image';
import {
  COST_COLORS, COST_BG, BOARD_ROWS, BOARD_COLS, TIER_CONFIG,
  type BuilderChampion, type BoardCell, type TierRow, type TierNode, type ItemDef, type ItemCategory,
  categorizeItem, getChampionOrigin, getChampionClass
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

/* eslint-disable react-hooks/globals */
export function BuilderClient({ champions = [], dbAugments = [], items = [], traitsDb = [] }: { champions?: any[]; dbAugments?: any[]; items?: any[]; traitsDb?: any[]; }) {
  const [board, setBoard] = useState<BoardCell[][]>(
    Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('Cost');
  const [showNames, setShowNames] = useState(true);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  
  const boardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Augment modal
  const [augModalOpen, setAugModalOpen] = useState(false);
  const [selectedAugments, setSelectedAugments] = useState<string[]>([]);
  const [augSearch, setAugSearch] = useState('');
  const [augRarity, setAugRarity] = useState<'All' | 'Silver' | 'Gold' | 'Prismatic'>('All');

  // Roster mode (bottom panel)
  const [itemTab, setItemTab] = useState<ItemCategory>('Components');

  // History
  const [history, setHistory] = useState<BoardCell[][][]>([]);

  // Load from URL params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const augParam = params.get('augments');
      const boardParam = params.get('board');
      const compParam = params.get('comp');

      if (augParam) {
        setSelectedAugments(augParam.split(',').filter(Boolean).slice(0, 3));
      }

      // Load a full comp from tierlist (JSON with champions, board_positions, augments)
      if (compParam) {
        try {
          const compData = JSON.parse(compParam);
          const champions = compData.champions || [];
          const boardPositions = compData.board_positions || [];

          const nextBoard: BoardCell[][] = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));

          // Place champions at saved board positions
          boardPositions.forEach((pos: any) => {
            const cc = champions.find((c: any) => c.id === pos.champion_id);
            const champ = champions.find((c: any) => c.id === pos.champion_id);
            if (champ && pos.row < BOARD_ROWS && pos.col < BOARD_COLS) {
              nextBoard[pos.row][pos.col] = {
                champion: champ,
                items: [],
                starLevel: (cc?.star || 1) as 1 | 2 | 3,
              };
            }
          });

          // If no positions, place champions in a line
          if (boardPositions.length === 0 && champions.length > 0) {
            let slot = 0;
            champions.forEach((cc: any) => {
              const champ = champions.find((c: any) => c.id === cc.id);
              if (champ) {
                const row = Math.floor(slot / BOARD_COLS);
                const col = slot % BOARD_COLS;
                if (row < BOARD_ROWS) {
                  nextBoard[row][col] = { champion: champ, items: [], starLevel: (cc.star || 1) as 1 | 2 | 3 };
                }
                slot++;
              }
            });
          }

          setBoard(nextBoard);
          if (compData.augments?.length) {
            setSelectedAugments(compData.augments.slice(0, 3));
          }
        } catch (e) {
          console.error('Failed to parse comp param:', e);
        }
        return; // Don't also process board param
      }

      if (boardParam) {
        const units = boardParam.split('|');
        const nextBoard = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
        
        let row = 1;
        let col = 1; // start putting them in the center randomly

        units.forEach((u) => {
          const [id, starStr, itemsStr] = u.split(':');
          const champ = champions.find(c => c.id === id);
          if (champ) {
            // Find next empty spot
            let placed = false;
            for (let r = 0; r < BOARD_ROWS; r++) {
              for (let c = 0; c < BOARD_COLS; c++) {
                if (!nextBoard[r][c] && !placed) {
                  nextBoard[r][c] = {
                    champion: champ,
                    starLevel: parseInt(starStr || '1', 10) as 1 | 2 | 3,
                    items: itemsStr ? itemsStr.split(',').filter(Boolean).slice(0, 3) : []
                  };
                  placed = true;
                }
              }
            }
          }
        });
        
        setBoard(nextBoard);
      }
    }
  }, []);

  // Active traits
  const activeTraits = useMemo(() => {
    const map: Record<string, number> = {};
    const seenChampIds = new Set<string>();

    board.flat().forEach(cell => {
      if (!cell) return;
      
      // Calculate traits from champion (base stats - only counted once per unique champ id)
      if (!seenChampIds.has(cell.champion.id)) {
        seenChampIds.add(cell.champion.id);
        cell.champion.traits.forEach(t => { map[t] = (map[t] || 0) + 1; });
      }

      // Calculate traits from Emblems
      cell.items.forEach(itemId => {
        const itemDef = items.find(i => i.id === itemId);
        if (itemDef && (itemDef.category === 'Emblems' || itemDef.name.includes('Emblem') || itemDef.name.includes('Crown'))) {
          // Attempt to match the item name to a valid trait
          const matchedTrait = traitsDb.find(t => itemDef.name.includes(t.name) || itemDef.id.includes(t.name));
          if (matchedTrait) {
            map[matchedTrait.name] = (map[matchedTrait.name] || 0) + 1;
          }
        }
      });
    });
    
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [board]);

  const placedCount = board.flat().filter(Boolean).length;

  const filteredChampions = useMemo(() => {
    let list = [...champions];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c: any) =>
        c.name.toLowerCase().includes(q) ||
        c.traits.some((t: any) => t.toLowerCase().includes(q))
      );
    }
    switch (sortMode) {
      case 'Cost': list.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)); break;
      case 'Name': list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'Origin': list.sort((a, b) => getChampionOrigin(a, traitsDb).localeCompare(getChampionOrigin(b, traitsDb)) || a.cost - b.cost); break;
      case 'Class': list.sort((a, b) => getChampionClass(a, traitsDb).localeCompare(getChampionClass(b, traitsDb)) || a.cost - b.cost); break;
    }
    return list;
  }, [searchQuery, sortMode]);

  const filteredItems = useMemo(() => {
    let list = items.map((i: any) => ({ ...i, category: categorizeItem(i.id) })).filter((i: any) => i.category === itemTab);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((i: any) => i.name.toLowerCase().includes(q));
    }
    return list;
  }, [itemTab, searchQuery, items]);

  const filteredAugments = useMemo(() => {
    let list = [...dbAugments];
    if (augRarity !== 'All') {
      list = list.filter(a => a.tier === augRarity || a.tier === augRarity.toLowerCase());
    }
    if (!augSearch) return list;
    return list.filter(a => a.name.toLowerCase().includes(augSearch.toLowerCase()));
  }, [augSearch, augRarity]);

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

    const dragPayload = currentDrag;

    if (dragPayload.type === 'champion') {
      const champ = champions.find(c => c.id === dragPayload.championId);
      if (!champ) return;
      setBoard(prev => {
        const next = prev.map(r => [...r]);
        next[row][col] = { champion: champ, items: [], starLevel: 1 };
        return next;
      });
    } else if (dragPayload.type === 'board-champion') {
      setBoard(prev => {
        const next = prev.map(r => [...r]);
        const src = next[dragPayload.fromRow!][dragPayload.fromCol!];
        next[dragPayload.fromRow!][dragPayload.fromCol!] = next[row][col];
        next[row][col] = src;
        return next;
      });
    } else if (dragPayload.type === 'item') {
      const cell = board[row][col];
      if (cell && cell.items.length < 3) {
        setBoard(prev => {
          const next = prev.map(r => [...r]);
          const unit = { ...next[row][col]! };
          unit.items = [...unit.items, dragPayload.itemId!];
          next[row][col] = unit;
          return next;
        });
      }
    }
    currentDrag = null;
  };

  const onDragOver = (e: DragEvent, target: string) => {
    e.preventDefault();
    if (currentDrag?.type === 'item') {
      e.dataTransfer.dropEffect = 'copy';
    } else {
      e.dataTransfer.dropEffect = 'move';
    }
    setDragOverTarget(target);
  };

  const clearBoard = () => {
    pushHistory();
    setBoard(Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null)));
    setSelectedAugments([]);
  };

  const shareAsImage = async () => {
    if (!boardRef.current) return;
    try {
      setIsSharing(true);
      await new Promise(r => setTimeout(r, 100)); // allow state update
      // Hack to bypass html-to-image cssRules exception on cross-origin styles
      const originalDesc = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'cssRules');
      if (originalDesc) {
        Object.defineProperty(CSSStyleSheet.prototype, 'cssRules', {
          get: function () {
            try { return originalDesc.get!.call(this); } catch (e) { return []; }
          },
          configurable: true,
        });
      }

      const dataUrl = await toPng(boardRef.current, {
        cacheBust: true,
        backgroundColor: '#0a0a0f',
        pixelRatio: 2,
        filter: (node) => {
          if (node.nodeType === 1 && (node as HTMLElement).getAttribute('data-html2canvas-ignore') === 'true') return false;
          return true;
        }
      });

      if (originalDesc) {
        Object.defineProperty(CSSStyleSheet.prototype, 'cssRules', originalDesc);
      }

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'tft-comp.png';
      a.click();
    } catch (err) {
      console.error(err);
      alert('Failed to generate image');
    } finally {
      setIsSharing(false);
    }
  };

  const toggleStarLevel = (row: number, col: number) => {
    pushHistory();
    setBoard(prev => {
      const next = prev.map(r => [...r]);
      const cell = next[row][col];
      if (cell) {
        const currentStar = cell.starLevel || 1;
        const nextStar: 1 | 2 | 3 = currentStar === 1 ? 2 : currentStar === 2 ? 3 : 1;
        next[row][col] = { ...cell, starLevel: nextStar };
      }
      return next;
    });
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
            <button onClick={shareAsImage} disabled={isSharing} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-pumpkin)]/20 hover:border-[var(--color-pumpkin)] transition-all flex items-center gap-2">
              {isSharing ? 'Generating...' : '📸 Share'}
            </button>
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="flex gap-3 flex-col lg:flex-row">

          {/* SHARE AREA BOUNDARY */}
          <div ref={boardRef} className="flex gap-3 flex-col lg:flex-row flex-1 bg-[#0a0a0f] p-1 -m-1 rounded-2xl relative">
            {isSharing && (
              <div data-html2canvas-ignore="true" className="absolute inset-0 z-50 flex items-center justify-center bg-[#0a0a0f]/80 backdrop-blur-sm rounded-2xl">
                <span className="text-white font-bold tracking-widest animate-pulse">GENERATING IMAGE...</span>
              </div>
            )}
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
                        <span className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 z-10"
                          style={{ backgroundColor: isGold ? 'rgba(255,215,0,0.15)' : isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)', color: isGold ? 'var(--color-pumpkin)' : isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                          {count}
                        </span>
                        <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center opacity-80" style={{ filter: isGold ? 'sepia(1) saturate(5) hue-rotate(-30deg)' : isActive ? 'none' : 'grayscale(1) opacity(0.5)' }}>
                          <SpriteIcon type="trait" id={trait} alt={trait} className="w-full h-full drop-shadow-md" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <span className={`text-xs font-medium truncate block ${isActive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}>{trait}</span>
                          <span className="text-[8px] text-[var(--color-text-muted)] mt-0.5 opacity-60">2 › 4 › 6</span>
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
            <div className="grimoire-card p-3 sm:p-4 relative overflow-hidden min-h-[340px] shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none select-none"
                style={{ fontFamily: "'Cinzel', serif", fontSize: '72px', fontWeight: 900, whiteSpace: 'nowrap', letterSpacing: '8px' }}>
                <span className="gradient-text">TFT</span>Grimoire
              </div>

              <div className="flex flex-col items-center gap-[4px] py-10">
                {Array.from({ length: BOARD_ROWS }, (_, row) => (
                  <div key={row} className="flex gap-[4px]" style={{ marginLeft: row % 2 === 1 ? '44px' : '0' }}>
                    {Array.from({ length: BOARD_COLS }, (_, col) => {
                      const cell = board[row][col];
                      const hexId = `hex-${row}-${col}`;
                      const isOver = dragOverTarget === hexId;

                      return (
                        <div
                          key={`${row}-${col}`}
                          className="group relative"
                          style={{ width: '84px', height: '92px' }}
                          onDragOver={e => onDragOver(e, hexId)}
                          onDragLeave={() => setDragOverTarget(null)}
                          onDrop={e => onDropBoard(e, row, col)}
                          onClick={() => cell && toggleStarLevel(row, col)}
                          onContextMenu={(e) => { e.preventDefault(); if (cell) removeFromBoard(row, col); }}
                        >
                          <div className="absolute inset-0 transition-all"
                            style={{
                              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                              background: cell ? COST_COLORS[cell.champion.cost] + '30' : isOver ? 'rgba(255,215,0,0.3)' : 'rgba(255, 255, 255, 0.05)',
                            }} />
                          <div className="absolute inset-[2px] flex flex-col items-center justify-center transition-colors shadow-inner"
                            style={{
                              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                              background: cell ? `linear-gradient(160deg, ${COST_BG[cell.champion.cost]}, rgba(10,8,20,0.95))` : 'rgba(12, 10, 24, 0.65)',
                            }}>
                            {cell ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-end pb-[6px] cursor-grab group/champ"
                                draggable onDragStart={e => onDragStartBoardChamp(e, row, col)}>
                                
                                {/* Background Avatar */}
                                <div className="absolute inset-0 pointer-events-none">
                                  <ChampionAvatar name={cell.champion.name} shape="hexagon" className="w-full h-full opacity-[0.85] group-hover/champ:opacity-100 transition-opacity" />
                                </div>

                                {/* Text Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
                                
                                {/* Foreground contents */}
                                <div className="relative z-10 flex flex-col items-center">
                                  {showNames && <span className="text-[9px] text-white font-bold mb-[8px] leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,1)] tracking-wide pointer-events-none">{cell.champion.name}</span>}
                                </div>
                              </div>
                            ) : (
                              <span className={`text-xs transition-opacity ${isOver ? 'text-[var(--color-pumpkin)] opacity-80' : 'text-[var(--color-text-muted)] opacity-20 group-hover:opacity-50'}`}>+</span>
                            )}
                          </div>
                          
                          {/* OVERLAYS OUTSIDE CLIP PATH */}
                          {cell && (
                            <>
                              {/* Star display */}
                              {cell.starLevel && cell.starLevel > 1 && (
                                <div className="absolute -top-[10px] left-0 right-0 w-full flex justify-center gap-[1px] z-30 pointer-events-none drop-shadow-[0_3px_3px_rgba(0,0,0,1)]">
                                  {Array.from({ length: cell.starLevel }, (_, i) => (
                                    <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" 
                                      className={`w-[18px] h-[18px] ${cell.starLevel === 3 ? "text-yellow-400 drop-shadow-[0_0_3px_rgba(250,204,21,0.8)]" : "text-gray-300 drop-shadow-[0_0_2px_rgba(209,213,219,0.8)]"}`}>
                                      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                                    </svg>
                                  ))}
                                </div>
                              )}

                              {/* Items display */}
                              {cell.items.length > 0 && (
                                <div className="absolute -bottom-[8px] left-0 right-0 flex justify-center gap-[2px] z-30">
                                  {cell.items.map((itemId, i) => {
                                    const itemDef = items.find(it => it.id === itemId);
                                    return (
                                      <span key={i}
                                        className="w-[20px] h-[20px] flex items-center justify-center cursor-pointer hover:scale-125 transition-transform bg-[#111] rounded-sm border border-[#2a2a35] overflow-hidden drop-shadow-md"
                                        title={itemDef?.name}
                                        onClick={e => { e.stopPropagation(); removeItemFromUnit(row, col, i); }}>
                                        <img src={getItemImageUrl(itemDef?.icon || itemId)} className="w-full h-full object-cover" alt="" crossOrigin="anonymous" />
                                      </span>
                                    )
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div> {/* END SHARE AREA */}

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
                        borderColor: aug ? RARITY_STYLES[dbAugments.find(a => a.name === aug)?.tier || 'Silver'].border + '30' : 'var(--color-border)',
                        backgroundColor: aug ? RARITY_STYLES[dbAugments.find(a => a.name === aug)?.tier || 'Silver'].bg : 'transparent',
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

        {/* BOTTOM: Champions & Items Roster */}
        <div className="mt-3 bg-[#111116] rounded-xl border border-[#2a2a35] overflow-hidden">
          {/* Header controls */}
          <div className="flex items-center justify-between p-3 border-b border-[#2a2a35]">
            <div className="flex items-center gap-6 text-xs font-bold text-white mb-1 mt-1 flex-1">
              {/* Search */}
              <div className="relative w-[240px]">
                <input type="text" placeholder="Search All" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 rounded-full bg-[#1c1c22] border border-[#2a2a35] text-sm text-[var(--color-text-primary)] placeholder:text-gray-500 focus:outline-none focus:border-[var(--color-pumpkin)] transition-colors" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 bg-[#2a2a35] px-1.5 py-0.5 rounded font-black tracking-wider">Ctrl + F</span>
              </div>

              {/* Champion sort modes */}
              <div className="flex gap-4">
                {(['Cost', 'Name', 'Origin', 'Class'] as const).map(mode => (
                  <button key={mode} onClick={() => setSortMode(mode)}
                    className={`transition-colors ${sortMode === mode ? 'text-[var(--color-pumpkin)] drop-shadow-md bg-[var(--color-pumpkin)]/10 px-3 py-1 rounded-full -ml-3' : 'text-gray-400 hover:text-white'}`}>
                    {mode}
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              {/* Item category tabs */}
              <div className="flex gap-4 pr-2">
                {(['Components', 'Completed', 'Radiants', 'Support', 'Artifacts', 'Emblems'] as const).map(tab => {
                  const label = tab === 'Completed' ? 'Craftables' : tab;
                  return (
                    <button key={tab} onClick={() => setItemTab(tab)}
                      className={`transition-colors ${itemTab === tab ? 'text-[#ffb703] drop-shadow-md bg-[#ffb703]/10 px-3 py-1 rounded-full -mx-3' : 'text-gray-400 hover:text-white'}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Rosters layout */}
          <div className="flex bg-[#111116] min-h-[400px]">
            {/* Champions Side */}
            <div className="flex-1 max-h-[550px] overflow-y-auto show-scrollbar p-4 pr-2">
              {(sortMode === 'Cost' || sortMode === 'Name') ? (
                <div className="flex flex-wrap gap-1">
                  {filteredChampions.map(champ => (
                    <div key={champ.id}
                      draggable
                      onDragStart={e => onDragStartChampion(e, champ)}
                      className="relative flex flex-col items-center gap-0.5 cursor-grab group hover:scale-105 transition-transform">
                      <HexagonFrame color={COST_COLORS[champ.cost]} bg={COST_BG[champ.cost]} size={52} padding={2} className="shadow-lg">
                        <ChampionAvatar name={champ.name} shape="hexagon" className="w-[46px] h-[50px] pointer-events-none" />
                      </HexagonFrame>
                      <span className="text-[8px] text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors max-w-[50px] truncate text-center mt-0.5">
                        {champ.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {Object.entries(
                    filteredChampions.reduce((acc: any, champ: any) => {
                      const groupTrait = sortMode === 'Origin' ? getChampionOrigin(champ, traitsDb) : getChampionClass(champ, traitsDb);
                      const key = groupTrait || 'Unknown';
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(champ);
                      return acc;
                    }, {} as Record<string, typeof filteredChampions>)
                  ).sort(([a], [b]) => a.localeCompare(b)).map(([groupTrait, champs]: [string, any]) => (
                    <div key={groupTrait} className="flex gap-3 items-center min-h-[58px]">
                      {/* Trait Icon column */}
                      <div className="w-10 flex shrink-0 items-center justify-center">
                         <SpriteIcon type="trait" id={groupTrait} className="w-8 h-8 opacity-[0.85] drop-shadow-md" alt={groupTrait} />
                      </div>
                      {/* Champions row */}
                      <div className="flex flex-wrap gap-1 flex-1">
                        {champs.map((champ: any) => (
                          <div key={champ.id}
                            draggable
                            onDragStart={e => onDragStartChampion(e, champ)}
                            className="relative flex flex-col items-center justify-center cursor-grab group hover:scale-105 transition-transform">
                            <HexagonFrame color={COST_COLORS[champ.cost]} bg={COST_BG[champ.cost]} size={52} padding={2} className="shadow-md">
                              <ChampionAvatar name={champ.name} shape="hexagon" className="w-[46px] h-[50px] shadow-sm pointer-events-none" />
                            </HexagonFrame>
                            <span className="text-[8px] text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors max-w-[50px] truncate text-center mt-0.5">
                              {champ.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="w-[1px] bg-[#2a2a35] opacity-50 shrink-0 my-4" />

            {/* Items Side */}
            <div className="w-[400px] shrink-0 max-h-[550px] overflow-y-auto show-scrollbar p-4 pl-3">
              <div className="grid grid-cols-7 gap-1.5">
                {filteredItems.map((item: any) => (
                  <div key={item.id}
                    draggable
                    onDragStart={e => onDragStartItem(e, item)}
                    className="relative flex flex-col items-center justify-center cursor-grab group hover:scale-105 transition-transform"
                    title={item.name}>
                    <div className="w-[38px] h-[38px] rounded-md border border-[var(--color-border)] bg-[#1c1c22] flex items-center justify-center group-hover:border-[#ffb703] group-hover:shadow-[0_0_8px_rgba(255,183,3,0.3)] transition-all overflow-hidden">
                      <img src={getItemImageUrl(item.icon || item.id)} alt={item.name} className="w-full h-full object-contain pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                    </div>
                  </div>
                ))}
              </div>
              {filteredItems.length === 0 && (
                <p className="text-xs text-gray-500 italic py-4 w-full text-center mt-4">No items found</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AUGMENT MODAL */}
      <AnimatePresence>
        {augModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setAugModalOpen(false)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()} className="relative bg-[#1c1c22] rounded-xl w-full max-w-4xl h-[85vh] flex flex-col p-4 border border-[var(--color-border)] shadow-2xl">
              
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-72 border border-[#40404a] rounded-full overflow-hidden bg-[#24242b]">
                    <input type="text" placeholder="Search for an augment..." value={augSearch} onChange={e => setAugSearch(e.target.value)} autoFocus
                      className="w-full px-4 py-2 bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none" />
                  </div>
                  <div className="flex items-center gap-1 bg-[#24242b] p-1 rounded-full border border-[#40404a]">
                    {(['All', 'Silver', 'Gold', 'Prismatic'] as const).map(rarity => (
                      <button
                        key={rarity}
                        onClick={() => setAugRarity(rarity)}
                        className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                          augRarity === rarity 
                            ? 'bg-[var(--color-pumpkin)] text-black' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {rarity}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setAugModalOpen(false)} className="text-sm font-bold text-white hover:text-gray-300 transition-colors">Close</button>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-bold text-white mb-2">Selected Augments ({selectedAugments.length}/3):</h3>
                <div className="min-h-[100px] border border-[#303038] bg-[#24242b] rounded-lg flex items-center p-3 gap-6">
                  {selectedAugments.map(name => {
                    const aug = dbAugments.find(a => a.name === name);
                    if (!aug) return null;
                    const style = RARITY_STYLES[aug.tier];
                    return (
                      <div key={name} className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform" onClick={() => toggleAugment(name)}>
                        <SpriteIcon type="augment" id={aug.id} icon={aug.icon} className="w-14 h-14" alt={aug.name} scale={56/48} />
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
                    const style = RARITY_STYLES[aug.tier];
                    return (
                      <div key={aug.id} onClick={() => toggleAugment(aug.name)}
                        className={`flex flex-col items-center cursor-pointer transition-all ${isSelected ? 'opacity-30' : 'hover:scale-110'}`}
                        title={aug.desc}>
                        <div className="w-14 h-14 relative flex items-center justify-center mb-2">
                          <SpriteIcon type="augment" id={aug.id} icon={aug.icon} className="w-full h-full" alt={aug.name} scale={56/48} />
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
