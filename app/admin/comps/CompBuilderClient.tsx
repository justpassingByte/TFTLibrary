'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useTransition, type DragEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createComp, updateComp, deleteComp, togglePublish, duplicateComp } from './actions'
import type { CuratedCompData, CuratedComp, CompChampion, AltBuild, StagePlan, BoardPosition } from './actions'
import { ChampionAvatar, HexagonFrame } from '@/components/ui/champion-avatar'
import { GameIcon } from '@/components/ui/game-icon'
import { getItemImageUrl } from '@/lib/riot-cdn'
import { useAdminSet } from '@/components/admin/AdminSetContext'
import {
  COST_COLORS, COST_BG, BOARD_ROWS, BOARD_COLS,
  type BuilderChampion, type BoardCell, type ItemDef, type ItemCategory,
  categorizeItem, getChampionOrigin, getChampionClass
} from '@/app/builder/builder-data'

// ── Types & Constants ────────────────────────────────
interface ChampionMeta { id: string; name: string; cost: number; icon: string; traits: string[] }
interface Props {
  comps: (CuratedComp & { variants: CuratedComp[] })[]
  champions: ChampionMeta[]
  dbAugments: any[]
  items?: any[]
  traitsDb?: any[]
}

const TIERS = ['S', 'A', 'B', 'C'] as const
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const
const TIER_COLORS: Record<string, string> = { S: '#ff2244', A: '#FF7A00', B: '#fbbf24', C: '#39FF14' }

// Drag payload (module-level like the original builder)
interface DragPayload { type: 'champion' | 'item' | 'board-champion'; championId?: string; itemId?: string; fromRow?: number; fromCol?: number }
let currentDrag: DragPayload | null = null

type SortMode = 'Cost' | 'Name' | 'Origin' | 'Class'

const RARITY_STYLES: Record<string, { border: string; bg: string; text: string }> = {
  Silver: { border: '#9ca3af', bg: 'rgba(156,163,175,0.08)', text: '#d1d5db' },
  Gold: { border: '#fbbf24', bg: 'rgba(251,191,36,0.08)', text: '#fbbf24' },
  Prismatic: { border: '#c084fc', bg: 'rgba(192,132,252,0.08)', text: '#c084fc' },
}

const EMPTY_COMP: CuratedCompData = {
  name: '', tier: 'A', carry_id: '', playstyle: '', difficulty: 'Medium',
  champions: [], early_units: [], flex_units: [],
  item_priority: [], alt_builds: [], augments: [], augment_priority: ['items', 'ECON', 'COMBAT'],
  board_positions: [], tips: '', stage_plans: [
    { stage: 'Stage 2', text: '' }, { stage: 'Stage 3', text: '' }, { stage: 'Stage 4', text: '' }
  ],
  parent_comp_id: null, variant_label: '', patch: '16.8', sort_order: 0, is_published: false,
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export function CompBuilderClient({ comps, champions: allChampions = [], dbAugments: allAugments = [], items = [], traitsDb: allTraits = [] }: Props) {
  const { currentSet } = useAdminSet()
  
  // Filter data by current set
  const champions = useMemo(() => allChampions.filter(c => !currentSet || (c as any).set_prefix === currentSet), [allChampions, currentSet])
  const dbAugments = useMemo(() => allAugments.filter(a => !currentSet || a.set_prefix?.includes(currentSet)), [allAugments, currentSet])
  const traitsDb = useMemo(() => allTraits.filter((t: any) => !currentSet || t.set_prefix === currentSet), [allTraits, currentSet])
  
  // Items don't have set_prefix in DB, but set-specific items (emblems, etc.) 
  // have the set prefix baked into their ID (e.g. TFT16_Item_VoidEmblemItem).
  // Generic items (TFT_Item_*) are shared across all sets.
  const filteredItemsBySet = useMemo(() => {
    if (!currentSet) return items
    return items.filter((item: any) => 
      item.set_prefix?.includes(currentSet) || 
      item.id.startsWith('TFT_Item_') || 
      item.id.includes('Radiant') || 
      item.id.includes('Artifact')
    )
  }, [items, currentSet])
  
  const [editing, setEditing] = useState<CuratedCompData & { id?: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  // ── Builder state (copied from BuilderClient) ──────
  const [board, setBoard] = useState<BoardCell[][]>(
    Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null))
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('Cost')
  const [showNames, setShowNames] = useState(true)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
  const [itemTab, setItemTab] = useState<ItemCategory>('Completed')
  const [history, setHistory] = useState<BoardCell[][][]>([])
  const [augModalOpen, setAugModalOpen] = useState(false)
  const [selectedAugments, setSelectedAugments] = useState<string[]>([])
  const [augSearch, setAugSearch] = useState('')
  const [augRarity, setAugRarity] = useState<'All' | 'Silver' | 'Gold' | 'Prismatic'>('All')

  // Build traits map from API champions (has correct traits vs empty static data)
  const champTraitsMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    champions.forEach(c => { if (c.traits?.length) map[c.id] = c.traits })
    return map
  }, [champions])

  // Active traits (computed from board)
  const activeTraits = useMemo(() => {
    const map: Record<string, number> = {}
    const seenChampIds = new Set<string>()
    board.flat().forEach(cell => {
      if (!cell) return
      if (!seenChampIds.has(cell.champion.id)) {
        seenChampIds.add(cell.champion.id)
        // Prefer DB traits over static data (static data often has empty traits[])
        const traits = champTraitsMap[cell.champion.id] || cell.champion.traits
        traits.forEach(t => { map[t] = (map[t] || 0) + 1 })
      }
      cell.items.forEach(itemId => {
        const itemDef = items.find(i => i.id === itemId)
        if (itemDef && (itemDef.category === 'Emblems' || itemDef.name.includes('Emblem') || itemDef.name.includes('Crown'))) {
          const matchedTrait = traitsDb.find(t => itemDef.name.includes(t.name) || itemDef.id.includes(t.name))
          if (matchedTrait) map[matchedTrait.name] = (map[matchedTrait.name] || 0) + 1
        }
      })
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [board, champTraitsMap])

  const placedCount = board.flat().filter(Boolean).length

  const filteredChampions = useMemo(() => {
    let list = [...champions]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.traits.some(t => t.toLowerCase().includes(q)))
    }
    switch (sortMode) {
      case 'Cost': list.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)); break
      case 'Name': list.sort((a, b) => a.name.localeCompare(b.name)); break
      case 'Origin': list.sort((a, b) => getChampionOrigin(a, traitsDb).localeCompare(getChampionOrigin(b, traitsDb)) || a.cost - b.cost); break
      case 'Class': list.sort((a, b) => getChampionClass(a, traitsDb).localeCompare(getChampionClass(b, traitsDb)) || a.cost - b.cost); break
    }
    return list
  }, [searchQuery, sortMode, traitsDb])

  const traitList = useMemo(() => {
    return traitsDb.filter((t: any) => t.type !== 'Custom')
  }, [traitsDb])

  const filteredItems = useMemo(() => {
    let list = filteredItemsBySet.map((i: any) => ({ ...i, category: categorizeItem(i.id) })).filter((i: any) => i.category === itemTab)
    if (searchQuery) { const q = searchQuery.toLowerCase(); list = list.filter((i: any) => i.name.toLowerCase().includes(q)) }
    return list
  }, [itemTab, searchQuery, filteredItemsBySet])

  const filteredAugments = useMemo(() => {
    let list = [...dbAugments]
    if (augRarity !== 'All') list = list.filter(a => a.tier === augRarity || a.tier === augRarity.toLowerCase())
    if (augSearch) list = list.filter(a => a.name?.toLowerCase().includes(augSearch.toLowerCase()))
    return list
  }, [augSearch, augRarity, dbAugments])

  const pushHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-19), board.map(r => [...r])])
  }, [board])

  // ── Load comp into builder ─────────────────────────
  function loadCompIntoBuilder(comp: CuratedCompData) {
    const nextBoard: BoardCell[][] = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null))
    const positions = (comp.board_positions || []) as BoardPosition[]
    const champData = (comp.champions || []) as CompChampion[]

    // Place champions on board from saved positions
    positions.forEach(pos => {
      const cc = champData.find(c => c.id === pos.champion_id)
      const champ = champions.find(c => c.id === pos.champion_id)
      if (champ && pos.row < BOARD_ROWS && pos.col < BOARD_COLS) {
        nextBoard[pos.row][pos.col] = {
          champion: champ,
          items: cc?.items || [], 
          starLevel: (cc?.star || 1) as 1 | 2 | 3,
        }
      }
    })

    // If no positions, place champions in a line
    if (positions.length === 0) {
      let slot = 0
      champData.forEach(cc => {
        const champ = champions.find(c => c.id === cc.id)
        if (champ) {
          const row = Math.floor(slot / BOARD_COLS)
          const col = slot % BOARD_COLS
          if (row < BOARD_ROWS) {
            nextBoard[row][col] = { champion: champ, items: cc.items || [], starLevel: (cc.star || 1) as 1 | 2 | 3 }
          }
          slot++
        }
      })
    }

    setBoard(nextBoard)
    setSelectedAugments(comp.augments || [])
    setHistory([])
  }

  // ── Extract board data for saving ──────────────────
  function extractBoardData(): { champions: CompChampion[]; board_positions: BoardPosition[]; carry_id: string } {
    const compChampions: CompChampion[] = []
    const board_positions: BoardPosition[] = []
    let carry_id = editing?.carry_id || ''

    board.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) {
          const existing = compChampions.find(ch => ch.id === cell.champion.id)
          if (!existing) {
            compChampions.push({ id: cell.champion.id, star: cell.starLevel || 1, is_carry: cell.champion.id === carry_id, items: cell.items || [] })
          } else if (cell.items && cell.items.length > 0 && (!existing.items || existing.items.length === 0)) {
            existing.items = cell.items;
          }
          board_positions.push({ champion_id: cell.champion.id, row: r, col: c })
        }
      })
    })

    // Auto-detect carry: highest cost champion if not explicitly set
    if (!carry_id && compChampions.length > 0) {
      const sorted = [...compChampions].sort((a, b) => {
        // Find cost from the outer props 'champions' array
        const ca = champions.find(x => x.id === a.id)
        const cb = champions.find(x => x.id === b.id)
        return (cb?.cost || 0) - (ca?.cost || 0)
      })
      carry_id = sorted[0].id
    }

    return { champions: compChampions, board_positions, carry_id }
  }

  // ── Drag handlers (same as BuilderClient) ──────────
  const onDragStartChampion = (e: DragEvent, champ: BuilderChampion) => {
    currentDrag = { type: 'champion', championId: champ.id }; e.dataTransfer.effectAllowed = 'copyMove'; e.dataTransfer.setData('text/plain', champ.id)
  }
  const onDragStartItem = (e: DragEvent, item: ItemDef) => {
    currentDrag = { type: 'item', itemId: item.id }; e.dataTransfer.effectAllowed = 'copyMove'; e.dataTransfer.setData('text/plain', item.id)
  }
  const onDragStartBoardChamp = (e: DragEvent, row: number, col: number) => {
    currentDrag = { type: 'board-champion', fromRow: row, fromCol: col }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', `board-${row}-${col}`)
  }

  const onDropBoard = (e: DragEvent, row: number, col: number) => {
    e.preventDefault(); setDragOverTarget(null); if (!currentDrag) return; pushHistory()
    const dragPayload = currentDrag
    if (dragPayload.type === 'champion') {
      const champ = champions.find(c => c.id === dragPayload.championId)
      if (!champ) return
      setBoard(prev => { const next = prev.map(r => [...r]); next[row][col] = { champion: champ, items: [], starLevel: 1 }; return next })
    } else if (dragPayload.type === 'board-champion') {
      setBoard(prev => { const next = prev.map(r => [...r]); const src = next[dragPayload.fromRow!][dragPayload.fromCol!]; next[dragPayload.fromRow!][dragPayload.fromCol!] = next[row][col]; next[row][col] = src; return next })
    } else if (dragPayload.type === 'item') {
      const cell = board[row][col]
      if (cell && cell.items.length < 3) {
        setBoard(prev => { const next = prev.map(r => [...r]); const unit = { ...next[row][col]! }; unit.items = [...unit.items, dragPayload.itemId!]; next[row][col] = unit; return next })
      }
    }
    currentDrag = null
  }

  const onDragOver = (e: DragEvent, target: string) => {
    e.preventDefault(); e.dataTransfer.dropEffect = currentDrag?.type === 'item' ? 'copy' : 'move'; setDragOverTarget(target)
  }

  const clearBoard = () => { pushHistory(); setBoard(Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null))); setSelectedAugments([]) }
  const toggleStarLevel = (row: number, col: number) => {
    pushHistory()
    setBoard(prev => { const next = prev.map(r => [...r]); const cell = next[row][col]; if (cell) { const ns: 1|2|3 = (cell.starLevel || 1) === 1 ? 2 : (cell.starLevel || 1) === 2 ? 3 : 1; next[row][col] = { ...cell, starLevel: ns } } return next })
  }
  const undo = () => { if (history.length > 0) { setBoard(history[history.length - 1]); setHistory(h => h.slice(0, -1)) } }
  const toggleAugment = (name: string) => { setSelectedAugments(prev => prev.includes(name) ? prev.filter(a => a !== name) : prev.length < 3 ? [...prev, name] : prev) }
  const removeFromBoard = (row: number, col: number) => { pushHistory(); setBoard(prev => { const next = prev.map(r => [...r]); next[row][col] = null; return next }) }
  const removeItemFromUnit = (row: number, col: number, itemIdx: number) => {
    setBoard(prev => { const next = prev.map(r => [...r]); const unit = { ...next[row][col]! }; unit.items = unit.items.filter((_, i) => i !== itemIdx); next[row][col] = unit; return next })
  }

  // ── CRUD ────────────────────────────────────────────
  function openNew() {
    setEditing({ ...EMPTY_COMP })
    setBoard(Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null)))
    setSelectedAugments([])
    setHistory([])
  }

  function openEdit(comp: CuratedComp) {
    const data = {
      ...comp,
      stage_plans: (comp.stage_plans as StagePlan[])?.length ? comp.stage_plans as StagePlan[] : EMPTY_COMP.stage_plans
    }
    setEditing(data)
    loadCompIntoBuilder(data)
  }

  function handleSave() {
    if (!editing) return
    const { champions, board_positions, carry_id } = extractBoardData()
    // Strip non-schema fields before saving
    const { id: _id, created_at: _ca, updated_at: _ua, variants: _v, ...editData } = editing as any
    const data: CuratedCompData = {
      ...editData,
      champions,
      board_positions,
      carry_id: editing.carry_id || carry_id,
      augments: selectedAugments,
      active_traits: activeTraits.map(([name, count]) => ({ name, count })),
    }
    startTransition(async () => {
      if (editing.id) await updateComp(editing.id, data)
      else await createComp(data)
      setSaved(true); setTimeout(() => { setSaved(false); setEditing(null) }, 600)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this comp and all its variants?')) return
    startTransition(async () => { await deleteComp(id); setEditing(null) })
  }

  // ═══════════════════════════════════════════════════
  // COMP LIST VIEW
  // ═══════════════════════════════════════════════════
  if (!editing) {
    return (
      <div style={{ maxWidth: 1100 }}>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 className="text-[1.4rem] font-bold text-[#f1effe]">Curated Comps</h2>
            <p className="text-[0.83rem] text-[#7c75a0]">{comps.length} comps · click to edit</p>
          </div>
          <button onClick={openNew} className="px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-white border-none cursor-pointer">+ New Comp</button>
        </div>

        {TIERS.map(tier => {
          const tierComps = comps.filter(c => c.tier === tier)
          if (tierComps.length === 0) return null
          return (
            <div key={tier} className="mb-6">
              <div className="text-sm font-extrabold tracking-wider mb-2 flex items-center gap-2" style={{ color: TIER_COLORS[tier] }}>
                <span className="text-xl">{tier}</span> TIER
                <span className="text-[0.72rem] text-[#5a5470] bg-white/5 px-2 py-0.5 rounded-full">{tierComps.length}</span>
              </div>
              <div className="flex flex-col gap-1">
                {tierComps.map(comp => {
                  const carry = champions.find(c => c.id === comp.carry_id)
                  return (
                    <div key={comp.id} className="flex items-center gap-3 px-4 py-2.5 bg-[#13111e] border border-white/[0.08] rounded-xl cursor-pointer transition-all hover:border-white/[0.2] hover:bg-[rgba(167,139,250,0.04)]"
                      onClick={() => openEdit(comp)}>
                      {carry && <HexagonFrame color={TIER_COLORS[comp.tier]} bg={COST_BG[carry.cost]} size={44} padding={1.5}>
                        <ChampionAvatar name={carry.name} icon={carry.icon} shape="hexagon" className="w-[38px] h-[38px]" />
                      </HexagonFrame>}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[#e2ddf5] text-sm">{comp.name}</div>
                        <div className="text-xs text-[#5a5470] flex items-center gap-2">
                          {(comp.champions as CompChampion[]).length} units · {comp.playstyle || comp.difficulty}
                          {comp.is_published && <span className="text-[0.65rem] font-extrabold text-[#4ade80] bg-[rgba(74,222,128,0.1)] px-1.5 py-0.5 rounded">LIVE</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button className="bg-none border-none cursor-pointer text-base p-1 rounded-md hover:bg-white/[0.05]" title="Duplicate"
                          onClick={e => { e.stopPropagation(); startTransition(() => duplicateComp(comp.id)) }}>📋</button>
                        <button className="bg-none border-none cursor-pointer text-base p-1 rounded-md hover:bg-white/[0.05]" title={comp.is_published ? 'Unpublish' : 'Publish'}
                          onClick={e => { e.stopPropagation(); startTransition(() => togglePublish(comp.id, !comp.is_published)) }}>
                          {comp.is_published ? '🟢' : '⚪'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════
  // COMP EDITOR VIEW (with full builder embedded)
  // ═══════════════════════════════════════════════════
  return (
    <div style={{ maxWidth: 1440 }}>
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#f1effe]">{editing.id ? 'Edit Comp' : 'New Comp'}</h2>
          <p className="text-sm text-[#7c75a0]">{editing.name || 'Untitled'} · {placedCount} units on board</p>
        </div>
        <div className="flex gap-2 items-center">
          {saved && <span className="text-[#4ade80] font-bold text-sm">✓ Saved</span>}
          <button onClick={() => setEditing(null)} className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-white/[0.1] bg-transparent text-[#7c75a0] cursor-pointer">Cancel</button>
          {editing.id && <button onClick={() => handleDelete(editing.id!)} className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-red-500/30 bg-transparent text-red-500 cursor-pointer">Delete</button>}
          <button onClick={handleSave} disabled={isPending} className="px-4 py-1.5 rounded-lg text-sm font-bold bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-white border-none cursor-pointer disabled:opacity-50">
            {isPending ? 'Saving…' : 'Save Comp'}
          </button>
        </div>
      </div>

      {/* ── Comp metadata bar ── */}
      <div className="bg-[#13111e] border border-white/[0.08] rounded-xl p-4 mb-3 flex flex-wrap gap-4 items-end">
        <label className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <span className="text-[0.7rem] font-semibold text-[#7c75a0] uppercase tracking-wide">Comp Name</span>
          <input className="bg-white/[0.04] border border-white/[0.12] rounded-lg px-3 py-2 text-[#f1effe] text-sm outline-none font-inherit" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Freljord Invokers" />
        </label>
        <label className="flex flex-col gap-1 min-w-[140px]">
          <span className="text-[0.7rem] font-semibold text-[#7c75a0] uppercase tracking-wide">Playstyle</span>
          <input className="bg-white/[0.04] border border-white/[0.12] rounded-lg px-3 py-2 text-[#f1effe] text-sm outline-none font-inherit" value={editing.playstyle} onChange={e => setEditing({ ...editing, playstyle: e.target.value })} placeholder="4-Cost Fast 8" />
        </label>
        <label className="flex flex-col gap-1 w-20">
          <span className="text-[0.7rem] font-semibold text-[#7c75a0] uppercase tracking-wide">Patch</span>
          <input className="bg-white/[0.04] border border-white/[0.12] rounded-lg px-3 py-2 text-[#f1effe] text-sm outline-none font-inherit" value={editing.patch} onChange={e => setEditing({ ...editing, patch: e.target.value })} />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-[0.7rem] font-semibold text-[#7c75a0] uppercase tracking-wide">Tier</span>
          <div className="flex gap-1">
            {TIERS.map(t => (
              <button key={t} className="px-3 py-1.5 rounded-md text-sm font-bold border cursor-pointer transition-all"
                style={editing.tier === t ? { background: TIER_COLORS[t], color: '#000', borderColor: TIER_COLORS[t] } : { background: 'transparent', color: '#7c75a0', borderColor: 'rgba(255,255,255,0.12)' }}
                onClick={() => setEditing({ ...editing, tier: t })}>{t}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[0.7rem] font-semibold text-[#7c75a0] uppercase tracking-wide">Difficulty</span>
          <div className="flex gap-1">
            {DIFFICULTIES.map(d => (
              <button key={d} className="px-3 py-1.5 rounded-md text-xs font-semibold border cursor-pointer transition-all"
                style={editing.difficulty === d ? { background: 'rgba(167,139,250,0.2)', borderColor: 'rgba(167,139,250,0.4)', color: '#c4b5fd' } : { background: 'transparent', color: '#7c75a0', borderColor: 'rgba(255,255,255,0.12)' }}
                onClick={() => setEditing({ ...editing, difficulty: d })}>{d}</button>
            ))}
          </div>
        </div>
        <button className="px-3 py-1.5 rounded-md text-sm font-semibold border cursor-pointer"
          style={editing.is_published ? { background: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.3)', color: '#4ade80' } : { background: 'transparent', color: '#7c75a0', borderColor: 'rgba(255,255,255,0.12)' }}
          onClick={() => setEditing({ ...editing, is_published: !editing.is_published })}>
          {editing.is_published ? '🟢 Live' : '⚪ Draft'}
        </button>
      </div>

      {/* ═══ FULL BUILDER (same as /builder) ═══ */}
      <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)] mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] cursor-pointer select-none">
            Names
            <div className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors duration-200 ${showNames ? 'bg-[var(--color-pumpkin)]' : 'bg-[var(--color-grimoire-lighter)]'}`}
              onClick={() => setShowNames(!showNames)}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${showNames ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </div>
          </label>
          <div className="w-px h-5 bg-[var(--color-border)]" />
          <button onClick={undo} disabled={history.length === 0}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${history.length > 0 ? 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed'}`}>Undo</button>
          <button onClick={clearBoard} className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-blood)] hover:border-[var(--color-blood)]/30 transition-colors">Clear Board</button>
        </div>
      </div>

      <div className="flex gap-3 flex-col lg:flex-row">
        {/* LEFT: Active Traits */}
        <div className="lg:w-52 flex-shrink-0">
          <div className="grimoire-card p-3 sticky top-20">
            {activeTraits.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] italic py-4 text-center">Place units to see traits</p>
            ) : (
              <div className="space-y-1">
                {activeTraits.map(([trait, count]) => {
                  const isActive = count >= 2; const isGold = count >= 4
                  return (
                    <div key={trait} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                      style={{ backgroundColor: isGold ? 'rgba(255,215,0,0.08)' : isActive ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                      <span className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 z-10"
                        style={{ backgroundColor: isGold ? 'rgba(255,215,0,0.15)' : isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)', color: isGold ? 'var(--color-pumpkin)' : isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                        {count}
                      </span>
                      <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center opacity-80" style={{ filter: isGold ? 'sepia(1) saturate(5) hue-rotate(-30deg)' : isActive ? 'none' : 'grayscale(1) opacity(0.5)' }}>
                        <GameIcon type="trait" id={trait} icon={traitsDb?.find((t: any) => t.name === trait)?.icon} alt={trait} className="w-full h-full drop-shadow-md" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <span className={`text-xs font-medium truncate block ${isActive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}>{trait}</span>
                      </div>
                    </div>
                  )
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
                    const cell = board[row][col]; const hexId = `hex-${row}-${col}`; const isOver = dragOverTarget === hexId
                    return (
                      <div key={`${row}-${col}`} className="group relative" style={{ width: '84px', height: '92px' }}
                        onDragOver={e => onDragOver(e, hexId)} onDragLeave={() => setDragOverTarget(null)}
                        onDrop={e => onDropBoard(e, row, col)} onClick={() => cell && toggleStarLevel(row, col)}
                        onContextMenu={e => { e.preventDefault(); if (cell) removeFromBoard(row, col) }}>
                        <div className="absolute inset-0 transition-all" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: cell ? COST_COLORS[cell.champion.cost] + '30' : isOver ? 'rgba(255,215,0,0.3)' : 'rgba(255, 255, 255, 0.05)' }} />
                        <div className="absolute inset-[2px] flex flex-col items-center justify-center transition-colors shadow-inner"
                          style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', background: cell ? `linear-gradient(160deg, ${COST_BG[cell.champion.cost]}, rgba(10,8,20,0.95))` : 'rgba(12, 10, 24, 0.65)' }}>
                          {cell ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-end pb-[6px] cursor-grab group/champ"
                              draggable onDragStart={e => onDragStartBoardChamp(e, row, col)}>
                              <div className="absolute inset-0 pointer-events-none"><ChampionAvatar name={cell.champion.name} icon={cell.champion.icon} shape="hexagon" className="w-full h-full opacity-[0.85] group-hover/champ:opacity-100 transition-opacity" /></div>
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
                              <div className="relative z-10 flex flex-col items-center">
                                {showNames && <span className="text-[9px] text-white font-bold mb-[8px] leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,1)] tracking-wide pointer-events-none">{cell.champion.name}</span>}
                              </div>
                            </div>
                          ) : (
                            <span className={`text-xs transition-opacity ${isOver ? 'text-[var(--color-pumpkin)] opacity-80' : 'text-[var(--color-text-muted)] opacity-20 group-hover:opacity-50'}`}>+</span>
                          )}
                        </div>
                        {cell && (<>
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
                          {cell.items.length > 0 && (
                            <div className="absolute -bottom-[8px] left-0 right-0 flex justify-center gap-[2px] z-30">
                              {cell.items.map((itemId, i) => (
                                <span key={i} className="w-[20px] h-[20px] flex items-center justify-center cursor-pointer hover:scale-125 transition-transform bg-[#111] rounded-sm border border-[#2a2a35] overflow-hidden drop-shadow-md"
                                  title={items.find(it => it.id === itemId)?.name} onClick={e => { e.stopPropagation(); removeItemFromUnit(row, col, i) }}>
                                  <img src={getItemImageUrl(items.find(it => it.id === itemId)?.icon || itemId)} className="w-full h-full object-cover" alt="" crossOrigin="anonymous" />
                                </span>
                              ))}
                            </div>
                          )}
                        </>)}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Augments */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="grimoire-card p-3 sticky top-20">
            <h3 className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-2">Augments</h3>
            <div className="space-y-1.5 mb-2">
              {[0, 1, 2].map(i => {
                const aug = selectedAugments[i]
                return (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-colors cursor-pointer"
                    style={{ borderColor: aug ? RARITY_STYLES[(dbAugments.find(a => a.name === aug)?.tier) || 'Silver'].border + '30' : 'var(--color-border)', backgroundColor: aug ? RARITY_STYLES[(dbAugments.find(a => a.name === aug)?.tier) || 'Silver'].bg : 'transparent' }}
                    onClick={() => aug ? toggleAugment(aug) : setAugModalOpen(true)}>
                    {aug ? (<><span className="text-xs text-[var(--color-text-secondary)] flex-1 truncate">{aug}</span><span className="text-[var(--color-text-muted)] text-[10px] hover:text-[var(--color-blood)]">✕</span></>) :
                      (<span className="text-xs text-[var(--color-text-muted)] flex-1 text-center">+</span>)}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Champion & Item Roster (right below board for easy drag) ── */}
      <div className="mt-3 bg-[#111116] rounded-xl border border-[#2a2a35] overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-[#2a2a35]">
          <div className="flex items-center gap-6 text-xs font-bold text-white flex-1 flex-wrap">
            <div className="relative w-[240px]">
              <input type="text" placeholder="Search All" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-full bg-[#1c1c22] border border-[#2a2a35] text-sm text-[var(--color-text-primary)] placeholder:text-gray-500 focus:outline-none focus:border-[var(--color-pumpkin)] transition-colors" />
            </div>
            <div className="flex gap-4">
              {(['Cost', 'Name', 'Origin', 'Class'] as const).map(mode => (
                <button key={mode} onClick={() => setSortMode(mode)}
                  className={`transition-colors ${sortMode === mode ? 'text-[var(--color-pumpkin)] drop-shadow-md bg-[var(--color-pumpkin)]/10 px-3 py-1 rounded-full' : 'text-gray-400 hover:text-white'}`}>{mode}</button>
              ))}
            </div>
            <div className="flex-1" />
            <div className="flex gap-4 pr-2">
              {(['Components', 'Completed', 'Radiants', 'Support', 'Artifacts', 'Emblems'] as const).map(tab => (
                <button key={tab} onClick={() => setItemTab(tab)}
                  className={`transition-colors ${itemTab === tab ? 'text-[#ffb703] drop-shadow-md bg-[#ffb703]/10 px-3 py-1 rounded-full' : 'text-gray-400 hover:text-white'}`}>
                  {tab === 'Completed' ? 'Craftables' : tab}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex bg-[#111116] min-h-[350px]">
          <div className="flex-1 max-h-[450px] overflow-y-auto show-scrollbar p-4 pr-2">
            <div className="flex flex-wrap gap-1">
              {filteredChampions.map(champ => (
                <div key={champ.id} draggable onDragStart={e => onDragStartChampion(e, champ)}
                  className="relative flex flex-col items-center gap-0.5 cursor-grab group hover:scale-105 transition-transform">
                  <HexagonFrame color={COST_COLORS[champ.cost]} bg={COST_BG[champ.cost]} size={52} padding={2} className="shadow-lg">
                    <ChampionAvatar name={champ.name} icon={champ.icon} shape="hexagon" className="w-[46px] h-[50px] pointer-events-none" />
                  </HexagonFrame>
                  <span className="text-[8px] text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors max-w-[50px] truncate text-center mt-0.5">{champ.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-[1px] bg-[#2a2a35] opacity-50 shrink-0 my-4" />
          <div className="w-[400px] shrink-0 max-h-[450px] overflow-y-auto show-scrollbar p-4 pl-3">
            <div className="grid grid-cols-7 gap-1.5">
              {filteredItems.map(item => (
                <div key={item.id} draggable onDragStart={e => onDragStartItem(e, item)}
                  className="relative flex flex-col items-center justify-center cursor-grab group hover:scale-105 transition-transform" title={item.name}>
                  <div className="w-[38px] h-[38px] rounded-md border border-[var(--color-border)] bg-[#1c1c22] flex items-center justify-center group-hover:border-[#ffb703] group-hover:shadow-[0_0_8px_rgba(255,183,3,0.3)] transition-all overflow-hidden">
                    <img src={getItemImageUrl(item.icon || item.id)} alt={item.name} className="w-full h-full object-contain pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Strategy Section — all draggable ── */}
      <div className="bg-[#13111e] border border-white/[0.08] rounded-xl p-4 mt-3">

        {/* Row 1: Early Units | Item Priority | Flex Units */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Early Units */}
          <div>
            <div className="cmp-section-label">Early Units</div>
            <div className="cmp-drop-row"
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
              onDrop={e => { e.preventDefault(); if (currentDrag?.type === 'champion' && currentDrag.championId) { const dragId = currentDrag.championId; setEditing(prev => prev ? { ...prev, early_units: [...(prev.early_units || []).filter(id => id !== dragId), dragId] } : prev); } currentDrag = null }}>
              {(editing.early_units || []).map(id => {
                const ch = champions.find(c => c.id === id)
                if (!ch) return null
                return (
                  <div key={id} className="cmp-drop-unit" onClick={() => setEditing({ ...editing, early_units: (editing.early_units || []).filter(x => x !== id) })}>
                    <HexagonFrame color={COST_COLORS[ch.cost]} bg={COST_BG[ch.cost]} size={42} padding={1.5}>
                      <ChampionAvatar name={ch.name} icon={ch.icon} shape="hexagon" className="w-[36px] h-[36px]" />
                    </HexagonFrame>
                    <span className="cmp-drop-name">{ch.name}</span>
                  </div>
                )
              })}
              {(editing.early_units || []).length === 0 && <span className="cmp-drop-hint">Drag champions here</span>}
            </div>
          </div>

          {/* Item Priority */}
          <div>
            <div className="cmp-section-label">Item Priority</div>
            <div className="cmp-drop-row"
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
              onDrop={e => { e.preventDefault(); if (currentDrag?.type === 'item' && currentDrag.itemId) { const dragId = currentDrag.itemId; setEditing(prev => prev ? { ...prev, item_priority: [...(prev.item_priority || []).filter(id => id !== dragId), dragId] } : prev); } currentDrag = null }}>
              {(editing.item_priority || []).map((id, idx) => {
                const item = items.find(i => i.id === id)
                if (!item) return null
                return (
                  <div key={id} className="flex items-center gap-1">
                    {idx > 0 && <span className="text-[#5a5470] text-xs font-bold">▸</span>}
                    <div className="cmp-drop-item" onClick={() => setEditing({ ...editing, item_priority: (editing.item_priority || []).filter(x => x !== id) })} title={item.name}>
                      <img src={getItemImageUrl(item.icon || id)} className="w-full h-full object-contain" alt={item.name} />
                    </div>
                  </div>
                )
              })}
              {(editing.item_priority || []).length === 0 && <span className="cmp-drop-hint">Drag items here</span>}
            </div>
          </div>

          {/* Flex Units */}
          <div>
            <div className="cmp-section-label">Flex Units</div>
            <div className="cmp-drop-row"
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
              onDrop={e => { e.preventDefault(); if (currentDrag?.type === 'champion' && currentDrag.championId) { const dragId = currentDrag.championId; setEditing(prev => prev ? { ...prev, flex_units: [...(prev.flex_units || []).filter(id => id !== dragId), dragId] } : prev); } currentDrag = null }}>
              {(editing.flex_units || []).map(id => {
                const ch = champions.find(c => c.id === id)
                if (!ch) return null
                return (
                  <div key={id} className="cmp-drop-unit" onClick={() => setEditing({ ...editing, flex_units: (editing.flex_units || []).filter(x => x !== id) })}>
                    <HexagonFrame color={COST_COLORS[ch.cost]} bg={COST_BG[ch.cost]} size={42} padding={1.5}>
                      <ChampionAvatar name={ch.name} icon={ch.icon} shape="hexagon" className="w-[36px] h-[36px]" />
                    </HexagonFrame>
                    <span className="cmp-drop-name">{ch.name}</span>
                  </div>
                )
              })}
              {(editing.flex_units || []).length === 0 && <span className="cmp-drop-hint">Drag champions here</span>}
            </div>
          </div>
        </div>

        {/* Row 2: Augment Priority | Carry | Alt Builds */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Augment Priority (reorderable tags) */}
          <div>
            <div className="cmp-section-label">Augment Priority</div>
            <div className="cmp-aug-prio">
              {(editing.augment_priority || []).map((tag, idx) => (
                <div key={tag} className="flex items-center gap-1">
                  {idx > 0 && <span className="text-[#5a5470] text-sm font-bold">▸</span>}
                  <div className="cmp-prio-tag" draggable
                    onDragStart={e => { e.dataTransfer.setData('text/plain', `prio-${tag}`); (e.target as any).dataset.prioTag = tag }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault()
                      const from = e.dataTransfer.getData('text/plain')
                      if (from.startsWith('prio-')) {
                        const fromTag = from.replace('prio-', '')
                        const list = [...(editing.augment_priority || [])]
                        const fi = list.indexOf(fromTag), ti = list.indexOf(tag)
                        if (fi >= 0 && ti >= 0) { list.splice(fi, 1); list.splice(ti, 0, fromTag); setEditing({ ...editing, augment_priority: list }) }
                      }
                    }}>
                    {tag}
                    <button className="cmp-prio-x" onClick={() => setEditing({ ...editing, augment_priority: (editing.augment_priority || []).filter(t => t !== tag) })}>×</button>
                  </div>
                </div>
              ))}
              {/* Add tag selector */}
              <select className="cmp-prio-add" value="" onChange={e => {
                if (e.target.value && !(editing.augment_priority || []).includes(e.target.value)) {
                  setEditing({ ...editing, augment_priority: [...(editing.augment_priority || []), e.target.value] })
                }
              }}>
                <option value="">+ Add</option>
                {['items', 'ECON', 'COMBAT', 'FLEX', 'TANK', 'DAMAGE', 'UTILITY'].filter(t => !(editing.augment_priority || []).includes(t)).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Carry (drop champion) */}
          <div>
            <div className="cmp-section-label">Carry Champion</div>
            <div className="cmp-drop-row"
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
              onDrop={e => { e.preventDefault(); if (currentDrag?.type === 'champion' && currentDrag.championId) { const dragId = currentDrag.championId; setEditing(prev => prev ? { ...prev, carry_id: dragId } : prev); } currentDrag = null }}>
              {editing.carry_id ? (() => {
                const ch = champions.find(c => c.id === editing.carry_id)
                if (!ch) return <span className="cmp-drop-hint">{editing.carry_id}</span>
                return (
                  <div className="cmp-drop-unit" onClick={() => setEditing({ ...editing, carry_id: '' })}>
                    <HexagonFrame color={TIER_COLORS[editing.tier]} bg={COST_BG[ch.cost]} size={52} padding={2}>
                      <ChampionAvatar name={ch.name} icon={ch.icon} shape="hexagon" className="w-[46px] h-[46px]" />
                    </HexagonFrame>
                    <span className="cmp-drop-name font-bold">{ch.name}</span>
                  </div>
                )
              })() : <span className="cmp-drop-hint">Drag carry here</span>}
            </div>
          </div>

          {/* Alt Builds */}
          <div>
            <div className="cmp-section-label">Alt Builds</div>
            <div className="cmp-drop-row"
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
              onDrop={e => { e.preventDefault(); if (currentDrag?.type === 'champion' && currentDrag.championId) { const dragId = currentDrag.championId; setEditing(prev => prev ? { ...prev, alt_builds: [...(prev.alt_builds || []).filter((b: any) => b.carry_id !== dragId), { carry_id: dragId, label: '', items: [] } as AltBuild] } : prev); } currentDrag = null }}>
              {(editing.alt_builds || []).map((ab: any) => {
                const ch = champions.find(c => c.id === ab.carry_id)
                if (!ch) return null
                return (
                  <div key={ab.carry_id} className="flex flex-col items-center gap-0.5 group relative">
                    <div className="cmp-drop-unit" onClick={() => setEditing({ ...editing, alt_builds: (editing.alt_builds || []).filter((b: any) => b.carry_id !== ab.carry_id) })}
                      onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy' }}
                      onDrop={e => {
                        e.preventDefault(); e.stopPropagation();
                        if (currentDrag?.type === 'item' && currentDrag.itemId) {
                           const dragId = currentDrag.itemId;
                           setEditing(prev => {
                             if (!prev) return prev;
                             const builds = [...(prev.alt_builds || [])];
                             const idx = builds.findIndex(b => b.carry_id === ab.carry_id);
                             if (idx >= 0) {
                               const nb = { ...builds[idx] };
                               if (!nb.items) nb.items = [];
                               if (nb.items.length < 3) nb.items = [...nb.items, dragId];
                               builds[idx] = nb;
                             }
                             return { ...prev, alt_builds: builds };
                           });
                        }
                        currentDrag = null;
                      }}
                    >
                      <HexagonFrame color={COST_COLORS[ch.cost]} bg={COST_BG[ch.cost]} size={42} padding={1.5}>
                        <ChampionAvatar name={ch.name} icon={ch.icon} shape="hexagon" className="w-[36px] h-[36px]" />
                      </HexagonFrame>
                      <span className="cmp-drop-name">{ch.name}</span>
                    </div>
                    {/* Render items below */}
                    {ab.items && ab.items.length > 0 && (
                      <div className="flex justify-center gap-[2px] mt-0.5 relative z-10 pointer-events-none group-hover:pointer-events-auto transition-transform hover:scale-105">
                        {ab.items.map((itemId: string, itemIdx: number) => (
                          <span key={itemIdx} className="w-[16px] h-[16px] flex items-center justify-center cursor-pointer hover:border-[#e74c3c] transition-colors bg-[#111] rounded-[3px] border border-[#2a2a35] overflow-hidden drop-shadow-md"
                            title={items.find(it => it.id === itemId)?.name} onClick={e => {
                              e.stopPropagation();
                              setEditing(prev => {
                                if (!prev) return prev;
                                const builds = [...(prev.alt_builds || [])];
                                const idx = builds.findIndex(b => b.carry_id === ab.carry_id);
                                if (idx >= 0) {
                                  const nb = { ...builds[idx] };
                                  nb.items = nb.items.filter((_, i) => i !== itemIdx);
                                  builds[idx] = nb;
                                }
                                return { ...prev, alt_builds: builds };
                              });
                            }}>
                            <img src={getItemImageUrl(items.find(it => it.id === itemId)?.icon || itemId)} className="w-full h-full object-cover" alt="" crossOrigin="anonymous" />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {(editing.alt_builds || []).length === 0 && <span className="cmp-drop-hint">Drag alt carries here</span>}
            </div>
          </div>
        </div>

        {/* Row 3: Tips (text) */}
        <div className="flex flex-col gap-1 mb-4">
          <div className="cmp-section-label">Tips</div>
          <textarea className="w-full bg-white/[0.04] border border-white/[0.12] rounded-lg px-3 py-2 text-[#f1effe] text-[0.83rem] outline-none font-inherit resize-y" rows={3}
            value={editing.tips} onChange={e => setEditing({ ...editing, tips: e.target.value })} placeholder="General strategy tips…" />
        </div>

        {/* Row 4: Stage-by-Stage Guide (text) */}
        <div>
          <div className="cmp-section-label mb-2">Stage-by-Stage Guide</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(editing.stage_plans as StagePlan[]).map((sp, i) => (
              <div key={sp.stage} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                <div className="text-[0.7rem] font-extrabold bg-white/[0.06] inline-block px-2.5 py-0.5 rounded-full mb-2 text-white">{sp.stage}</div>
                <textarea className="w-full bg-white/[0.04] border border-white/[0.12] rounded-lg px-3 py-2 text-[#f1effe] text-[0.78rem] outline-none font-inherit resize-y" rows={3}
                  value={sp.text} onChange={e => { const plans = [...editing.stage_plans as StagePlan[]]; plans[i] = { ...plans[i], text: e.target.value }; setEditing({ ...editing, stage_plans: plans }) }}
                  placeholder={`What to do in ${sp.stage}…`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drop zone styles */}
      <style>{`
        .cmp-section-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #7c75a0; margin-bottom: 0.4rem; }
        .cmp-drop-row { min-height: 60px; padding: 0.5rem; border: 1.5px dashed rgba(255,255,255,0.1); border-radius: 12px; display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; background: rgba(255,255,255,0.015); transition: border-color 0.15s, background 0.15s; }
        .cmp-drop-row:hover { border-color: rgba(167,139,250,0.3); background: rgba(167,139,250,0.03); }
        .cmp-drop-hint { font-size: 0.75rem; color: #4a4566; font-style: italic; width: 100%; text-align: center; pointer-events: none; }
        .cmp-drop-unit { display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer; transition: transform 0.12s; position: relative; }
        .cmp-drop-unit:hover { transform: scale(1.08); }
        .cmp-drop-unit::after { content: '×'; position: absolute; top: -4px; right: -4px; width: 14px; height: 14px; border-radius: 50%; background: #e74c3c; color: white; font-size: 9px; display: none; align-items: center; justify-content: center; line-height: 1; }
        .cmp-drop-unit:hover::after { display: flex; }
        .cmp-drop-name { font-size: 0.55rem; color: #7c75a0; max-width: 50px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
        .cmp-drop-item { width: 34px; height: 34px; border-radius: 6px; border: 1.5px solid rgba(255,255,255,0.15); overflow: hidden; cursor: pointer; transition: all 0.12s; background: #1c1c22; position: relative; }
        .cmp-drop-item:hover { border-color: #e74c3c; transform: scale(1.1); }
        .cmp-drop-item::after { content: '×'; position: absolute; top: -3px; right: -3px; width: 12px; height: 12px; border-radius: 50%; background: #e74c3c; color: white; font-size: 8px; display: none; align-items: center; justify-content: center; line-height: 1; }
        .cmp-drop-item:hover::after { display: flex; }
        .cmp-aug-prio { display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap; min-height: 40px; padding: 0.4rem; border: 1.5px dashed rgba(255,255,255,0.1); border-radius: 12px; background: rgba(255,255,255,0.015); }
        .cmp-prio-tag { display: flex; align-items: center; gap: 4px; padding: 0.3rem 0.6rem; border-radius: 20px; font-size: 0.7rem; font-weight: 800; color: #f1effe; background: rgba(167,139,250,0.15); border: 1px solid rgba(167,139,250,0.3); cursor: grab; user-select: none; text-transform: uppercase; letter-spacing: 0.06em; }
        .cmp-prio-x { background: none; border: none; color: #7c75a0; cursor: pointer; font-size: 0.85rem; padding: 0; margin-left: 2px; line-height: 1; }
        .cmp-prio-x:hover { color: #e74c3c; }
        .cmp-prio-add { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; color: #7c75a0; font-size: 0.7rem; font-weight: 700; padding: 0.25rem 0.5rem; cursor: pointer; outline: none; }
      `}</style>

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
                    <input type="text" placeholder="Search augments..." value={augSearch} onChange={e => setAugSearch(e.target.value)} autoFocus
                      className="w-full px-4 py-2 bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none" />
                  </div>
                  <div className="flex items-center gap-1 bg-[#24242b] p-1 rounded-full border border-[#40404a]">
                    {(['All', 'Silver', 'Gold', 'Prismatic'] as const).map(rarity => (
                      <button key={rarity} onClick={() => setAugRarity(rarity)}
                        className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${augRarity === rarity ? 'bg-[var(--color-pumpkin)] text-black' : 'text-gray-400 hover:text-white'}`}>{rarity}</button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setAugModalOpen(false)} className="text-sm font-bold text-white hover:text-gray-300 transition-colors">Close</button>
              </div>
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white mb-2">Selected Augments ({selectedAugments.length}/3):</h3>
                <div className="min-h-[80px] border border-[#303038] bg-[#24242b] rounded-lg flex items-center p-3 gap-6">
                  {selectedAugments.map(name => {
                    const aug = dbAugments.find(a => a.name === name)
                    if (!aug) return null
                    return (
                      <div key={name} className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform" onClick={() => toggleAugment(name)}>
                        <GameIcon type="augment" id={aug.id} icon={aug.icon} className="w-14 h-14" alt={aug.name} scale={56 / 48} />
                        <span className="text-[10px] text-white font-black uppercase tracking-wider mt-2 text-center">{aug.name}</span>
                      </div>
                    )
                  })}
                  {selectedAugments.length === 0 && <span className="text-sm text-gray-500 italic px-2">No augments selected</span>}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto show-scrollbar border border-[#303038] bg-[#24242b] rounded-lg p-5">
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-x-2 gap-y-8">
                  {filteredAugments.map(aug => {
                    const isSelected = selectedAugments.includes(aug.name)
                    return (
                      <div key={aug.id} onClick={() => toggleAugment(aug.name)}
                        className={`flex flex-col items-center cursor-pointer transition-all ${isSelected ? 'opacity-30' : 'hover:scale-110'}`} title={aug.desc}>
                        <div className="w-14 h-14 relative flex items-center justify-center mb-2">
                          <GameIcon type="augment" id={aug.id} icon={aug.icon} className="w-full h-full" alt={aug.name} scale={56 / 48} />
                        </div>
                        <span className="text-[9px] font-black text-center leading-tight uppercase tracking-wide text-white">{aug.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
