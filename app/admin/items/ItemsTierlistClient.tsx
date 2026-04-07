'use client'

import { useState, useTransition } from 'react'
import { bulkUpsertItemTiers } from './actions'
import { categorizeItem } from '@/app/builder/builder-data'
import { GameIcon } from '@/components/ui/game-icon'
import { useAdminSet } from '@/components/admin/AdminSetContext'

const TIERS = ['S', 'A', 'B', 'C', 'D'] as const
const TIER_COLORS: Record<string, string> = { S: '#EB5E28', A: '#F3BB45', B: '#7AC29A', C: '#68B3C8', D: '#9A9A9A' }

interface Props {
  itemTiers: { item_id: string; tier: string; patch: string }[]
  itemStats: { item_name: string; avg_placement: number; top4_rate: number; usage_count: number }[]
  items: any[]
}

export function ItemsTierlistClient({ itemTiers, itemStats, items = [] }: Props) {
  const { currentSet } = useAdminSet()
  
  const [tiers, setTiers] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    itemTiers.forEach(it => { map[it.item_id] = it.tier })
    return map
  })
  
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('Craftable')
  const [saved, setSaved] = useState(false)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  const statsMap: Record<string, { avg: number }> = {}
  itemStats.forEach(s => { statsMap[s.item_name] = { avg: s.avg_placement } })

  const displayItems = items
    .map(i => ({ ...i, category: i.category || categorizeItem(i.id) }))
    .filter(i => {
      const hidden = i.isHidden || i.is_hidden || false
      if (hidden) return false

      if (categoryFilter === 'Craftable' && i.category !== 'Completed') return false 
      if (categoryFilter === 'Artifact' && i.category !== 'Artifacts') return false
      if (categoryFilter === 'Radiant' && i.category !== 'Radiants') return false
      if (categoryFilter === 'Support' && i.category !== 'Support') return false

      if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
      return ['Completed', 'Artifacts', 'Radiants', 'Support'].includes(i.category as string)
    })

  function handleDragStart(e: React.DragEvent, itemId: string) {
    setDraggedItem(itemId)
    e.dataTransfer.effectAllowed = 'move'
    // Optional transparent drag image setup could go here
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e: React.DragEvent, tier: string | null) {
    e.preventDefault()
    if (!draggedItem) return
    setTiers(prev => {
      const next = { ...prev }
      if (tier) {
         next[draggedItem] = tier
      } else {
         delete next[draggedItem]
      }
      return next
    })
    setDraggedItem(null)
  }

  function handleUntier(e: React.MouseEvent, itemId: string) {
    e.preventDefault()
    setTiers(prev => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
  }

  function saveChanges() {
    startTransition(async () => {
      const payload = Object.entries(tiers).map(([item_id, tier]) => ({ item_id, tier }))
      await bulkUpsertItemTiers(payload, '16.8')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const untiered = displayItems.filter(i => !tiers[i.id])

  return (
    <div className="items-admin">
      <div className="ia-header">
        <div>
          <h2 className="pd-title">Item Tierlist</h2>
          <p className="ia-sub">Drag and drop to rank items, then press save.</p>
        </div>
        
        <div className="ia-controls">
          <div className="ia-filters">
            <div className="ia-cat-btn" style={{ fontWeight: 'bold', color: '#68B3C8', cursor: 'default' }}>{currentSet.replace('TFT', 'Set ')}</div>
            <div style={{ width: '1px', background: '#DDD', margin: '0 5px' }} />
             {['Craftable', 'Artifact', 'Radiant', 'Support'].map(cat => (
                <button key={cat} className={`ia-cat-btn ${categoryFilter === cat ? 'active' : ''}`} onClick={() => setCategoryFilter(cat)}>
                  {cat}
                </button>
             ))}
          </div>
          <input className="ia-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…" />
          <button className="pd-btn-save" onClick={saveChanges} disabled={isPending}>
            {isPending ? 'Saving...' : saved ? '✓ Saved' : 'Save Tiers'}
          </button>
        </div>
      </div>

      <div className="ia-split-layout">
        {/* LEFT COLUMN: The actual Tier rows */}
        <div className="pd-card ia-tiers-container">
          {TIERS.map(tier => {
            const items = displayItems.filter(i => tiers[i.id] === tier)
            return (
              <div 
                key={tier} 
                className="ia-tier-row"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, tier)}
              >
                <div className="ia-tier-label" style={{ backgroundColor: TIER_COLORS[tier] }}>
                  {tier}
                </div>
                <div className="ia-tier-list">
                  {items.length === 0 ? (
                    <span className="ia-empty">Drop items here</span>
                  ) : items.map(item => (
                    <div 
                    key={item.id} 
                    className="ia-item-card drag-item"
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onContextMenu={(e) => handleUntier(e, item.id)}
                    title={item.name + ' (Right click to remove)'}
                  >
                    <GameIcon type="item" id={item.id} icon={item.icon || item.id} className="w-[85%] h-[85%] pointer-events-none drop-shadow-md" alt={item.name} />
                    {statsMap[item.id] && <div className="ia-item-stat-overlay">{statsMap[item.id].avg.toFixed(2)}</div>}
                  </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* RIGHT COLUMN: The un-tiered items */}
        <div className="pd-card ia-untiered-container">
          <h4 className="pd-title" style={{ fontSize: '16px', marginBottom: '15px' }}>Untiered Items</h4>
          <div 
            className="ia-untiered-grid"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, null)}
          >
            {untiered.length === 0 ? (
               <div className="ia-empty">All items in this view are tiered!</div>
            ) : (
               untiered.map(item => (
                 <div 
                 key={item.id} 
                 className="ia-item-card drag-item"
                 draggable
                 onDragStart={(e) => handleDragStart(e, item.id)}
                 title={item.name}
               >
                 <GameIcon type="item" id={item.id} icon={item.icon || item.id} className="w-[85%] h-[85%] pointer-events-none drop-shadow-md" alt={item.name} />
                 {statsMap[item.id] && (
                   <div className="ia-item-stat-overlay">{statsMap[item.id].avg.toFixed(2)}</div>
                 )}
               </div>
               ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        .items-admin { max-width: 1200px; padding-bottom: 40px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #252422; }
        
        .ia-header { 
           display: flex; align-items: center; justify-content: space-between; 
           margin-bottom: 25px; border-bottom: 1px solid #DDDDDD; padding-bottom: 20px;
           flex-wrap: wrap; gap: 1rem;
        }
        .pd-title { font-size: 24px; font-weight: 300; color: #252422; margin: 0 0 0.3rem; }
        .ia-sub { font-size: 14px; color: #9A9A9A; margin: 0; }
        
        .ia-controls { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        
        .ia-search { 
           background: #FFFFFF; border: 1px solid #DDDDDD; border-radius: 6px; 
           padding: 8px 12px; color: #252422; font-size: 14px; outline: none; width: 180px; 
        }
        .ia-search:focus { border-color: #68B3C8; }

        .ia-filters { 
           display: flex; gap: 5px; background: #FFFFFF; padding: 4px; 
           border-radius: 6px; border: 1px solid #DDDDDD;
        }
        
        .ia-cat-btn { 
           background: transparent; border: none; color: #9A9A9A; padding: 6px 14px; 
           font-size: 13px; font-weight: 600; cursor: pointer; border-radius: 4px; transition: 0.2s; 
        }
        .ia-cat-btn:hover { color: #66615B; background: #F4F3EF; }
        .ia-cat-btn.active { color: #FFFFFF; background: #68B3C8; }

        .pd-btn-save {
           background-color: #7AC29A;
           color: white;
           border: none;
           padding: 8px 20px;
           border-radius: 6px;
           font-size: 14px;
           font-weight: 600;
           cursor: pointer;
           transition: opacity 0.2s;
        }
        .pd-btn-save:hover { opacity: 0.8; }
        .pd-btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Paper Dashboard Card */
        .pd-card {
          background-color: #FFFFFF;
          border-radius: 6px;
          box-shadow: 0 2px 2px rgba(204, 197, 185, 0.5);
          border: 1px solid #F1EAE0;
        }

        .ia-split-layout {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
          align-items: start;
        }

        .ia-tiers-container { display: flex; flex-direction: column; overflow: hidden; padding: 0; }
        .ia-untiered-container { padding: 15px; position: sticky; top: 20px; max-height: calc(100vh - 40px); display: flex; flex-direction: column; }

        .ia-tier-row {
          display: flex;
          align-items: stretch;
          border-bottom: 1px solid #F1EAE0;
          min-height: 80px;
          transition: background 0.2s;
        }
        .ia-tier-row:last-child { border-bottom: none; }
        .ia-tier-row:hover { background-color: #FAFAFA; }

        .ia-tier-label {
          width: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }

        .ia-tier-list {
          flex: 1;
          display: flex;
          flex-wrap: wrap;
          padding: 10px;
          gap: 10px;
          align-items: center;
        }

        .ia-untiered-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          min-height: 100px;
          align-items: flex-start;
          padding: 10px;
          background: #FAFAFA;
          border-radius: 6px;
          border: 1px dashed #DDDDDD;
          overflow-y: auto;
          flex: 1;
        }
        
        .ia-empty {
           padding: 0 15px; color: #9A9A9A; font-size: 13px; font-style: italic; margin: auto;
        }
        
        .ia-item-card { 
           position: relative;
           width: 36px; height: 36px;
           border-radius: 4px; transition: 0.2s;
           box-shadow: 0 1px 3px rgba(0,0,0,0.2); user-select: none;
           background: #1e1e1e;
           overflow: hidden;
        }
        .drag-item { cursor: grab; }
        .drag-item:active { cursor: grabbing; box-shadow: 0 4px 10px rgba(0,0,0,0.3); transform: translateY(-2px); outline: 2px solid #68B3C8; }
        
        .ia-item-icon { width: 100%; height: 100%; pointer-events: none; object-fit: contain; }
        
        .ia-item-stat-overlay {
           position: absolute;
           bottom: 0; right: 0; left: 0;
           background: rgba(0, 0, 0, 0.7);
           color: #fff;
           font-size: 9.5px;
           font-weight: 700;
           line-height: 1;
           text-align: center;
           padding: 2px 0;
           pointer-events: none;
        }

        @media (max-width: 900px) {
          .ia-split-layout { grid-template-columns: 1fr; }
          .ia-untiered-container { position: static; max-height: unset; }
        }
      `}</style>
    </div>
  )
}
