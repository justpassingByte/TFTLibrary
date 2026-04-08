'use client'

import { useState, useTransition } from 'react'
import { bulkUpdateAugments, type Augment } from './actions'
import { useAdminSet } from '@/components/admin/AdminSetContext'
import { GameIcon } from '@/components/ui/game-icon'

const TIERS = ['S', 'A', 'B', 'C', 'D'] as const
const TIER_COLORS: Record<string, string> = { S: '#EB5E28', A: '#F3BB45', B: '#7AC29A', C: '#68B3C8', D: '#9A9A9A' }

interface Props {
  augments: Augment[]
}

const BASE_TIERS = [
  { id: 1, name: 'Silver' },
  { id: 2, name: 'Gold' },
  { id: 3, name: 'Prismatic' }
]

export function AugmentsPageClient({ augments }: Props) {
  const { currentSet, availableSets, setCurrentSet } = useAdminSet()
  // meta_tier state
  const [tiers, setTiers] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    augments.forEach(aug => { 
       if (aug.meta_tier) map[aug.id] = aug.meta_tier 
    })
    return map
  })
  
  // base tier state
  const [baseTiers, setBaseTiers] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    augments.forEach(aug => { map[aug.id] = typeof aug.tier === 'number' ? aug.tier : (aug.tier === 'Prismatic' ? 3 : aug.tier === 'Gold' ? 2 : 1) })
    return map
  })
  
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number>(1)
  const [saved, setSaved] = useState(false)
  const [draggedItems, setDraggedItems] = useState<string[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const displayAugments = augments.filter(a => {
    // Filter by set
    if (currentSet && a.set_prefix && !a.set_prefix.includes(currentSet)) return false
    const currentBaseTier = baseTiers[a.id]
    if (currentBaseTier !== categoryFilter) return false
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function handleToggleSelect(e: React.MouseEvent, id: string) {
    if (e.button !== 0) return; // Only process left clicks
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    if (selectedItems.has(id)) {
      setDraggedItems(Array.from(selectedItems))
    } else {
      setDraggedItems([id])
      setSelectedItems(new Set([id]))
    }
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e: React.DragEvent, tier: string | null) {
    e.preventDefault()
    if (draggedItems.length === 0) return
    setTiers(prev => {
      const next = { ...prev }
      draggedItems.forEach(itemId => {
        if (tier) {
           next[itemId] = tier
        } else {
           delete next[itemId]
        }
      })
      return next
    })
    setDraggedItems([])
    setSelectedItems(new Set())
  }

  function handleDropBaseTier(e: React.DragEvent, tierId: number) {
    e.preventDefault()
    if (draggedItems.length === 0) return
    setBaseTiers(prev => {
      const next = { ...prev }
      draggedItems.forEach(itemId => {
         next[itemId] = tierId
      })
      return next
    })
    setDraggedItems([])
    setSelectedItems(new Set())
  }

  function handleUntier(e: React.MouseEvent, id: string) {
    e.preventDefault()
    setTiers(prev => {
      const next = { ...prev }
      if (selectedItems.has(id)) {
        selectedItems.forEach(itemId => {
          delete next[itemId]
        })
      } else {
        delete next[id]
      }
      return next
    })
    setSelectedItems(new Set())
  }

  function saveChanges() {
    startTransition(async () => {
      const payload: { id: string; meta_tier?: string | null; tier?: number }[] = []
      
      augments.forEach(a => {
         const currentMeta = a.meta_tier
         const nextMeta = tiers[a.id] || null
         
         const aBaseTierRaw = typeof a.tier === 'number' ? a.tier : (a.tier === 'Prismatic' ? 3 : a.tier === 'Gold' ? 2 : 1)
         const currentBase = aBaseTierRaw
         const nextBase = baseTiers[a.id]
         
         if (currentMeta !== nextMeta || currentBase !== nextBase) {
            payload.push({
               id: a.id,
               ...(currentMeta !== nextMeta ? { meta_tier: nextMeta } : {}),
               ...(currentBase !== nextBase ? { tier: nextBase } : {})
            })
         }
      })
      
      if (payload.length === 0) {
         setSaved(true)
         setTimeout(() => setSaved(false), 2000)
         return
      }

      try {
        await bulkUpdateAugments(payload)
      } catch (err) {
        console.error(err)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const untiered = displayAugments.filter(a => !tiers[a.id])

  return (
    <div className="augments-admin">
      <div className="ia-header">
        <div>
          <h2 className="pd-title">Augment Tierlist</h2>
          <p className="ia-sub" style={{ lineHeight: '1.6' }}>
            <b>1. Rank Meta Tier:</b> Drag augments into S, A, B, C, D rows below.<br/>
            <b>2. Change Base Tier:</b> Drag augments onto the 'Silver', 'Gold', or 'Prismatic' tabs above.<br/>
            <b>3. Multi-Select:</b> Click augments to select them and drag them together. Right click to untier.
          </p>
        </div>
        
        <div className="ia-controls">
          <div className="ia-filters" style={{ display: 'flex', gap: '5px' }}>
            <div className="ia-base-tab" style={{ fontWeight: 'bold', color: '#68B3C8', cursor: 'default' }}>{currentSet.replace('TFT', 'Set ')}</div>
            <div style={{ width: '1px', background: '#DDD', margin: '0 5px' }} />
             {BASE_TIERS.map(cat => (
                <div 
                   key={cat.id} 
                   className={`ia-base-tab ${categoryFilter === cat.id ? 'active' : ''}`} 
                   onClick={() => setCategoryFilter(cat.id)}
                   onDragOver={handleDragOver}
                   onDrop={(e) => handleDropBaseTier(e, cat.id)}
                >
                  {cat.name}
                </div>
             ))}
          </div>
          <input className="ia-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search augments…" />
          <button className="pd-btn-save" onClick={saveChanges} disabled={isPending}>
            {isPending ? 'Saving...' : saved ? '✓ Saved' : 'Save Tiers'}
          </button>
        </div>
      </div>

      <div className="ia-split-layout">
        {/* LEFT COLUMN: The actual Tier rows */}
        <div className="pd-card ia-tiers-container">
          {TIERS.map(tier => {
            const rowAugments = displayAugments.filter(a => tiers[a.id] === tier)
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
                  {rowAugments.length === 0 ? (
                    <span className="ia-empty">Drop augments here</span>
                  ) : rowAugments.map(aug => {
                    const currentBaseTier = baseTiers[aug.id]
                    const tierClass = currentBaseTier === 3 ? 'prismatic' : currentBaseTier === 2 ? 'gold' : 'silver'
                    return (
                    <div 
                      key={aug.id} 
                      className={`ia-item-card drag-item cost-${tierClass} ${selectedItems.has(aug.id) ? 'selected' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, aug.id)}
                      onContextMenu={(e) => handleUntier(e, aug.id)}
                      onClick={(e) => handleToggleSelect(e, aug.id)}
                      title={aug.name + ' (Right click to remove)'}
                    >
                      {aug.icon && (
                        <GameIcon type="augment" id={aug.id} icon={aug.icon} alt={aug.name} className="ia-item-icon" />
                      )}
                    </div>
                  )})}
                </div>
              </div>
            )
          })}
        </div>

        {/* RIGHT COLUMN: The un-tiered pool */}
        <div className="pd-card ia-untiered-container">
          <h4 className="pd-title" style={{ fontSize: '16px', marginBottom: '15px' }}>Untiered Pool</h4>
          <div 
            className="ia-untiered-grid"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, null)}
          >
            {untiered.length === 0 ? (
               <div className="ia-empty">All augments in this view are tiered!</div>
            ) : (
               untiered.map(aug => {
                 const currentBaseTier = baseTiers[aug.id]
                 const tierClass = currentBaseTier === 3 ? 'prismatic' : currentBaseTier === 2 ? 'gold' : 'silver'
                 return (
                 <div 
                   key={aug.id} 
                   className={`ia-item-card drag-item cost-${tierClass} ${selectedItems.has(aug.id) ? 'selected' : ''}`}
                   draggable
                   onDragStart={(e) => handleDragStart(e, aug.id)}
                   onContextMenu={(e) => handleUntier(e, aug.id)}
                   onClick={(e) => handleToggleSelect(e, aug.id)}
                   title={aug.name + ' (Right click to remove)'}
                 >
                   {aug.icon && (
                     <GameIcon type="augment" id={aug.id} icon={aug.icon} alt={aug.name} className="ia-item-icon" />
                   )}
                 </div>
               )})
            )}
          </div>
        </div>
      </div>

      <style>{`
        .augments-admin { max-width: 1200px; padding-bottom: 40px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #252422; }
        
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
        
        .ia-cat-btn, .ia-base-tab { 
           background: transparent; border: none; color: #9A9A9A; padding: 6px 14px; 
           font-size: 13px; font-weight: 600; cursor: pointer; border-radius: 4px; transition: 0.2s; 
        }
        .ia-cat-btn:hover, .ia-base-tab:hover { color: #66615B; background: #F4F3EF; }
        .ia-cat-btn.active, .ia-base-tab.active { color: #FFFFFF; background: #68B3C8; }

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
           display: flex; flex-direction: column; align-items: center; justify-content: center;
           width: 44px; height: 44px;
           background: transparent; border: none; border-radius: 4px; transition: 0.2s;
           user-select: none;
           position: relative;
        }

        .ia-item-card.selected::after {
           content: '';
           position: absolute;
           top: -2px; left: -2px; right: -2px; bottom: -2px;
           border: 2px solid #EB5E28;
           border-radius: 6px;
           pointer-events: none;
           z-index: 10;
        }

        /* Color coordination for augments to distinguish costs using drop shadow on the image instead of boxes */
        .ia-item-card.cost-silver .ia-item-icon { filter: drop-shadow(0 0 3px rgba(192,192,192,0.8)); }
        .ia-item-card.cost-gold .ia-item-icon { filter: drop-shadow(0 0 3px rgba(251,191,36,0.8)); }
        .ia-item-card.cost-prismatic .ia-item-icon { filter: drop-shadow(0 0 4px rgba(192,132,252,0.9)); }

        .drag-item { cursor: grab; }
        .drag-item:active { cursor: grabbing; transform: translateY(-2px); }
        
        .ia-item-icon { width: 100%; height: 100%; pointer-events: none; object-fit: contain; }

        @media (max-width: 900px) {
          .ia-split-layout { grid-template-columns: 1fr; }
          .ia-untiered-container { position: static; max-height: unset; }
        }
      `}</style>
    </div>
  )
}
