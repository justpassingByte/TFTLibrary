'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateChampionTraits, type Champion, type Trait } from './actions'
import { SpriteIcon } from '@/components/ui/sprite-icon'
import { getCDragonUrl } from '@/components/ui/champion-avatar'

const COST_COLORS: Record<number, string> = {
  1: '#9ca3af',
  2: '#4ade80',
  3: '#60a5fa',
  4: '#c084fc',
  5: '#fbbf24',
}

export function ChampionsPageClient({ champions, traits }: { champions: Champion[]; traits: Trait[] }) {
  const [searchChanmpion, setSearchChampion] = useState('')
  const [costFilter, setCostFilter] = useState<number | null>(null)
  const [isSaving, startTransition] = useTransition()
  const [saveSuccess, setSaveSuccess] = useState(false)
  const router = useRouter()
  
  // State tracking mutable traits
  const [pendingTraits, setPendingTraits] = useState<Record<string, string[]>>(() => {
    const acc: Record<string, string[]> = {}
    champions.forEach(c => acc[c.id] = [...c.traits])
    return acc
  })

  // Has changes
  const modifiedChamps = champions.filter(c => {
    const pending = pendingTraits[c.id] || []
    if (pending.length !== c.traits.length) return true
    return pending.some(t => !c.traits.includes(t)) || c.traits.some(t => !pending.includes(t))
  })
  const hasChanges = modifiedChamps.length > 0

  function assignTrait(champId: string, traitName: string) {
    setPendingTraits(prev => {
      const current = prev[champId] || []
      if (current.includes(traitName)) return prev
      return { ...prev, [champId]: [...current, traitName] }
    })
  }

  function resetTraits(champId: string) {
    setPendingTraits(prev => ({ ...prev, [champId]: [] }))
  }

  function removeTrait(champId: string, traitName: string) {
    setPendingTraits(prev => {
      const current = prev[champId] || []
      return { ...prev, [champId]: current.filter(t => t !== traitName) }
    })
  }

  function handleSaveAll() {
    startTransition(async () => {
      try {
        const payload = modifiedChamps.map(champ => ({
          champion_id: champ.id,
          traits: pendingTraits[champ.id]
        }));
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const res = await fetch(`${apiUrl}/api/admin/champions/bulk-traits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload }),
        });
        
        if (res.ok) {
           setSaveSuccess(true);
           setTimeout(() => setSaveSuccess(false), 2000);
           router.refresh(); // Soft refresh to update server-provided `champions` prop
        } else {
           alert('Failed to save champions.');
        }
      } catch (e) {
         console.error(e);
         alert('Error saving. Make sure the backend server is running.');
      }
    })
  }

  // Filter champions
  const filteredChampions = champions.filter(c => {
    if (costFilter !== null && c.cost !== costFilter) return false
    return !searchChanmpion || c.name.toLowerCase().includes(searchChanmpion.toLowerCase())
  })

  // Group champions by cost
  const costs = [...new Set(filteredChampions.map(c => c.cost))].sort((a, b) => a - b)

  // Sort traits alphabetically
  const activeTraitList = traits.slice().sort((a,b) => a.name.localeCompare(b.name))

  return (
    <div className="champ-dnd-page">
      <div className="champ-header">
        <div>
          <h2 className="champ-heading">Champion Synergies</h2>
          <p className="champ-sub">Drag champions from the left panel onto trait buckets to assign roles.</p>
        </div>
        <div className="champ-actions">
          {hasChanges && <span className="unsaved-badge">{modifiedChamps.length} champions modified</span>}
          <button 
             className="save-all-btn" 
             disabled={!hasChanges || isSaving || saveSuccess}
             onClick={handleSaveAll}
             style={{ backgroundColor: saveSuccess ? '#10B981' : '' }}
          >
             {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="dnd-layout">
        
        {/* Left Panel: Champions */}
        <div 
          className="panel-champions"
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#EB5E28'; }}
          onDragLeave={e => { e.currentTarget.style.borderColor = 'transparent'; }}
          onDrop={e => {
            e.preventDefault()
            e.currentTarget.style.borderColor = 'transparent'
            const dataStr = e.dataTransfer.getData('text/plain')
            try {
              const data = JSON.parse(dataStr)
              if (data.champId) {
                // If dragged back to pool, reset all traits so it re-appears
                resetTraits(data.champId)
              }
            } catch (err) {
              // Ignore invalid drops
            }
          }}
          style={{ border: '2px dashed transparent', transition: 'border-color 0.2s' }}
        >
          <div className="panel-header">
            <h3>Champions Pool</h3>
            <input 
               type="text" 
               placeholder="Search champions..." 
               value={searchChanmpion}
               onChange={e => setSearchChampion(e.target.value)}
               className="search-input"
            />
            <div className="cost-filters">
              {[1, 2, 3, 4, 5].map(cost => (
                <button
                  key={cost}
                  className={`cost-filter-btn ${costFilter === cost ? 'active' : ''}`}
                  onClick={() => setCostFilter(costFilter === cost ? null : cost)}
                  style={costFilter === cost ? { background: COST_COLORS[cost], color: '#fff', borderColor: COST_COLORS[cost] } : { color: COST_COLORS[cost], borderColor: '#EAEAEA' }}
                >
                  {cost}✦
                </button>
              ))}
            </div>
          </div>
          <div className="panel-scroll">
            {costs.map(cost => (
              <div key={cost} className="cost-section">
                <div className="cost-title" style={{ color: COST_COLORS[cost] }}>
                  {cost}✦ Cost
                </div>
                <div className="champ-grid">
                  {filteredChampions.filter(c => c.cost === cost).map(champ => {
                    const assignedList = pendingTraits[champ.id] || []
                    return (
                      <div 
                         key={champ.id} 
                         className={`champ-card ${assignedList.length > 0 ? 'has-traits' : ''}`}
                         draggable
                         onDragStart={(e) => {
                           e.dataTransfer.setData('text/plain', JSON.stringify({ champId: champ.id }))
                           e.currentTarget.style.opacity = '0.5'
                         }}
                         onDragEnd={(e) => {
                           e.currentTarget.style.opacity = '1'
                         }}
                         title={champ.name}
                      >
                        {champ.icon && (
                          <div style={{ position: 'relative' }}>
                            <img 
                              src={getCDragonUrl(champ.id)} 
                              alt={champ.name}
                              className="champ-avatar"
                              onError={(e) => {
                                 const target = e.currentTarget as HTMLImageElement;
                                 if (!target.dataset.fallback) {
                                   target.dataset.fallback = 'true';
                                   target.src = `https://ddragon.leagueoflegends.com/cdn/16.7.1/img/tft-champion/${champ.icon}`;
                                 }
                              }}
                            />
                            {assignedList.length > 0 && (
                               <div style={{ position: 'absolute', top: -5, right: -5, background: '#EB5E28', color: '#FFF', fontSize: '9px', fontWeight: 'bold', padding: '2px 5px', borderRadius: '10px' }}>
                                 {assignedList.length}
                               </div>
                            )}
                          </div>
                        )}
                        <span className="champ-name">{champ.name}</span>
                        {assignedList.length > 0 && (
                          <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '2px' }}>
                             {assignedList.map(t => (
                               <span key={t} style={{ fontSize: '8px', background: '#F0F0F0', padding: '1px 3px', borderRadius: '3px', color: '#666' }}>{t}</span>
                             ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Traits Buckets */}
        <div className="panel-traits">
          <div className="panel-header" style={{ borderBottom: '1px solid #F0F0F0', padding: '20px' }}>
            <h3 style={{ fontFamily: '"Courier New", Courier, serif', fontSize: '18px', margin: 0 }}>All Traits</h3>
          </div>
          
          <div className="traits-scroll">
             <div className="traits-grid">
                {activeTraitList.map(trait => {
                   const champsInTrait = champions.filter(c => (pendingTraits[c.id] || []).includes(trait.name))

                   return (
                     <div 
                        key={trait.id} 
                        className="trait-bucket"
                        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over') }}
                        onDragLeave={e => { e.currentTarget.classList.remove('drag-over') }}
                        onDrop={e => {
                           e.preventDefault()
                           e.currentTarget.classList.remove('drag-over')
                           const dataStr = e.dataTransfer.getData('text/plain')
                           try {
                             const data = JSON.parse(dataStr)
                             if (data.champId) {
                               if (data.fromTrait && data.fromTrait !== trait.name) {
                                 // Move operation: remove from old trait before adding to new
                                 removeTrait(data.champId, data.fromTrait)
                               }
                               assignTrait(data.champId, trait.name)
                             }
                           } catch {
                             if (dataStr && !dataStr.startsWith('{')) assignTrait(dataStr, trait.name)
                           }
                        }}
                     >
                        <div className="bucket-header">
                           <div className="bucket-icon">
                              <SpriteIcon type="trait" id={trait.name} alt={trait.name} className="w-full h-full" />
                           </div>
                           <h4 className="bucket-title">{trait.name}</h4>
                           <span className="bucket-count">{champsInTrait.length}</span>
                        </div>
                        
                        <div className="bucket-roster">
                           {champsInTrait.length === 0 ? (
                              <div className="bucket-empty">Drop champions here</div>
                           ) : (
                              champsInTrait.map(c => (
                                 <div 
                                    key={c.id} 
                                    className="roster-champ"
                                    draggable
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData('text/plain', JSON.stringify({ champId: c.id, fromTrait: trait.name }))
                                      e.currentTarget.style.opacity = '0.5'
                                    }}
                                    onDragEnd={(e) => {
                                      e.currentTarget.style.opacity = '1'
                                    }}
                                    title={c.name}
                                 >
                                    <img 
                                       src={getCDragonUrl(c.id)} 
                                       alt={c.name}
                                       className="roster-avatar"
                                       onError={(e) => {
                                          const target = e.currentTarget as HTMLImageElement;
                                          if (!target.dataset.fallback) {
                                            target.dataset.fallback = 'true';
                                            target.src = `https://ddragon.leagueoflegends.com/cdn/16.7.1/img/tft-champion/${c.icon}`;
                                          }
                                       }}
                                    />
                                    <button 
                                       className="roster-remove"
                                       onClick={() => removeTrait(c.id, trait.name)}
                                       title="Remove"
                                    >×</button>
                                 </div>
                              ))
                           )}
                        </div>
                     </div>
                   )
                })}
             </div>
          </div>
        </div>

      </div>

      <style>{`
        .champ-dnd-page {
          max-width: 1400px;
          margin: 0 auto;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #222;
          height: calc(100vh - 40px);
          display: flex;
          flex-direction: column;
        }

        .champ-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 20px;
        }
        
        .champ-heading {
          font-family: 'Courier New', Courier, serif;
          font-size: 32px; font-weight: 800; margin: 0 0 5px; color: #222;
        }
        
        .champ-sub { font-size: 13px; color: #9A9A9A; margin: 0; }

        .champ-actions {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .unsaved-badge {
          font-size: 11px;
          font-weight: bold;
          color: #EB5E28;
          background: #FDECEA;
          padding: 6px 12px;
          border-radius: 20px;
        }

        .save-all-btn {
          background: #4A90E2;
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .save-all-btn:hover:not(:disabled) { background: #357ABD; }
        .save-all-btn:disabled { background: #E8E8E8; color: #A9A9A9; cursor: not-allowed; }

        .dnd-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 25px;
          flex: 1;
          min-height: 0;
        }

        /* LEFT PANEL */
        .panel-champions {
          background: #FFF;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .panel-header {
          padding: 20px;
          border-bottom: 1px solid #F0F0F0;
        }
        
        .panel-header h3 {
          font-family: 'Courier New', Courier, serif;
          margin: 0 0 15px;
          font-size: 18px;
        }

        .search-input {
          width: 100%;
          padding: 10px 15px;
          background: #F8F4EE;
          border: 1px solid transparent;
          border-radius: 8px;
          font-size: 12px;
          outline: none;
          transition: 0.2s;
        }
        .search-input:focus { border-color: #EB5E28; background: #FFF; }

        .cost-filters {
          display: flex;
          gap: 6px;
          margin-top: 10px;
        }

        .cost-filter-btn {
          flex: 1;
          padding: 6px 0;
          font-size: 11px;
          font-weight: bold;
          background: #FFF;
          border: 1px solid #EAEAEA;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cost-filter-btn:hover { background: #FDFBFA; }

        .panel-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .cost-section { margin-bottom: 25px; }
        .cost-title {
          font-size: 11px; font-weight: bold; text-transform: uppercase;
          margin-bottom: 10px; border-bottom: 1px solid #F0F0F0; padding-bottom: 5px;
        }

        .champ-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .champ-card {
          display: flex; flex-direction: column; align-items: center; gap: 5px;
          cursor: grab; padding: 5px; border-radius: 8px; transition: background 0.2s;
        }
        .champ-card:hover { background: #F8F4EE; }
        .champ-card:active { cursor: grabbing; }

        .champ-avatar {
          width: 44px; height: 44px; border-radius: 8px; object-fit: cover;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1); pointer-events: none;
        }
        .champ-name { font-size: 10px; font-weight: bold; text-align: center; color: #444; pointer-events: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }


        /* RIGHT PANEL */
        .panel-traits {
          background: #FFF;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .panel-traits .panel-header h3 {
          margin: 0;
        }

        .traits-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 25px;
          background: #FDFBFA;
        }

        .traits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .trait-bucket {
          background: #FFF;
          border: 2px dashed #EAEAEA;
          border-radius: 12px;
          padding: 15px;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
        }
        .trait-bucket.drag-over { border-color: #50E3C2; background: #F0FBF8; }

        .bucket-header {
          display: flex; align-items: center; gap: 10px; margin-bottom: 15px;
        }

        .bucket-icon {
          width: 24px; height: 24px; filter: brightness(0) invert(1); opacity: 0.8;
          background: #222; border-radius: 50%; padding: 4px; display: flex; align-items: center; justify-content: center;
        }

        .bucket-title { margin: 0; font-size: 14px; font-weight: bold; flex: 1; font-family: 'Courier New', Courier, serif; }
        .bucket-count { font-size: 11px; font-weight: bold; background: #F0F0F0; padding: 2px 8px; border-radius: 10px; color: #666; }

        .bucket-roster {
          flex: 1;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          min-height: 50px;
          align-content: flex-start;
        }

        .bucket-empty {
          width: 100%;
          text-align: center;
          font-size: 11px;
          color: #CCC;
          padding-top: 15px;
        }

        .roster-champ {
          position: relative;
          width: 40px; height: 40px;
        }

        .roster-avatar {
          width: 100%; height: 100%; border-radius: 8px; object-fit: cover;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        .roster-remove {
          position: absolute;
          top: -6px; right: -6px;
          width: 16px; height: 16px;
          border-radius: 50%;
          background: #EB5E28;
          color: white;
          border: none;
          font-size: 10px;
          line-height: 1;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          opacity: 0; transition: 0.2s; padding: 0;
        }
        .roster-champ:hover .roster-remove { opacity: 1; }

      `}</style>
    </div>
  )
}
