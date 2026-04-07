'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'
import { ChampionAvatar, HexagonFrame } from '@/components/ui/champion-avatar'
import { COST_COLORS, COST_BG, categorizeItem } from '@/app/builder/builder-data'
import { getItemImageUrl } from '@/lib/riot-cdn'
import { SpriteIcon } from '@/components/ui/sprite-icon'

type TabKey = 'Overview' | 'Champions' | 'Items' | 'Synergy';
type SortKey = 'games' | 'pick_rate' | 'win_rate' | 'avg_placement' | 'top4_rate' | 'avg_star'

const PALETTE = { orange: '#EF4444', green: '#10B981', yellow: '#F59E0B', blue: '#3B82F6', text: '#252422', subtext: '#9A9A9A', border: '#F1EAE0' }
const getBaseId = (id: string | undefined | null) => id ? id.split('_').pop() : '';

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AnalyticsContent />
    </Suspense>
  )
}

function AnalyticsContent() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as TabKey) || 'Overview'

  const [tab, setTab] = useState<TabKey>(initialTab)
  const [loading, setLoading] = useState(true)

  // Data state — each endpoint loads independently
  const [overview, setOverview] = useState<any>(null)
  const [champStats, setChampStats] = useState<any[]>([])
  const [itemStats, setItemStats] = useState<any[]>([])
  const [itemChampStats, setItemChampStats] = useState<any[]>([])
  const [augmentStats, setAugmentStats] = useState<any[]>([])
  const [traitStats, setTraitStats] = useState<any[]>([])
  
  const [champsMeta, setChampsMeta] = useState<any[]>([])
  const [itemsMeta, setItemsMeta] = useState<any[]>([])

  const getChampMeta = (id: string) => champsMeta.find(x => getBaseId(x.id) === getBaseId(id));

  // List states
  const [champSort, setChampSort] = useState<SortKey>('games')
  const [champSortDir, setChampSortDir] = useState<'asc' | 'desc'>('desc')
  const [champCostFilter, setChampCostFilter] = useState<number>(1)
  const [itemSort, setItemSort] = useState<'usage_count' | 'avg_placement' | 'top4_rate' | 'win_rate'>('usage_count')
  const [itemSortDir, setItemSortDir] = useState<'asc' | 'desc'>('desc')
  const [itemCategoryFilter, setItemCategoryFilter] = useState<string>('Completed')
  const [synergySelectedItem, setSynergySelectedItem] = useState<string | null>(null)
  const [synergySelectedChampion, setSynergySelectedChampion] = useState<string | null>(null)
  const [synergyPivot, setSynergyPivot] = useState<'item' | 'champion'>('item')

  useEffect(() => {
    setSynergySelectedItem(null)
    setSynergySelectedChampion(null)
  }, [itemCategoryFilter, champCostFilter, synergyPivot])

  const [patchList, setPatchList] = useState<string[]>([])
  const [selectedPatch, setSelectedPatch] = useState<string>('')
  const [patchSelectorLoading, setPatchSelectorLoading] = useState(false)

  // 1. Fetch Master Metadata & Available Patches Once
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    Promise.all([
      fetch(`${apiUrl}/api/meta/stats/patches`).then(r => r.json()).catch(() => []),
      fetch(`${apiUrl}/api/meta/champions`).then(r => r.json()).catch(() => []),
      fetch(`${apiUrl}/api/meta/items`).then(r => r.json()).catch(() => []),
    ]).then(([patches, cMeta, iMeta]) => {
      setPatchList(patches)
      if (patches && patches.length > 0) setSelectedPatch(patches[0])
      setChampsMeta(cMeta)
      setItemsMeta(iMeta)
    }).finally(() => setLoading(false))
  }, [])

  // 2. Fetch Aggregated Stats when Selected Patch changes
  useEffect(() => {
    if (!selectedPatch) return
    setPatchSelectorLoading(true)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    
    Promise.all([
      fetch(`${apiUrl}/api/meta/stats/overview`).then(r => r.json()).catch(() => null),
      fetch(`${apiUrl}/api/meta/stats/champions?patch=${selectedPatch}`).then(r => r.json()).catch(() => []),
      fetch(`${apiUrl}/api/meta/stats/items?patch=${selectedPatch}`).then(r => r.json()).catch(() => []),
      fetch(`${apiUrl}/api/meta/stats/augments?patch=${selectedPatch}`).then(r => r.json()).catch(() => []),
      fetch(`${apiUrl}/api/meta/stats/traits?patch=${selectedPatch}`).then(r => r.json()).catch(() => []),
      fetch(`${apiUrl}/api/meta/stats/item-champions?limit=200&patch=${selectedPatch}`).then(r => r.json()).catch(() => []),
    ]).then(([ov, champs, items, augs, traits, ic]) => {
      setOverview(ov)
      setChampStats(champs)
      setItemStats(items)
      setAugmentStats(augs)
      setTraitStats(traits)
      setItemChampStats(ic)
    }).finally(() => setPatchSelectorLoading(false))
  }, [selectedPatch])

  const toggleChampSort = (key: SortKey) => {
    if (champSort === key) setChampSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setChampSort(key); setChampSortDir('desc') }
  }
  const toggleItemSort = (key: typeof itemSort) => {
    if (itemSort === key) setItemSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setItemSort(key); setItemSortDir('desc') }
  }
  const sortArrow = (active: boolean, dir: 'asc' | 'desc') => active ? (dir === 'desc' ? ' ▼' : ' ▲') : ''

  const champData = useMemo(() => {
    let list = [...champStats]

    if (champCostFilter) {
      list = list.filter((c: any) => {
        const meta = getChampMeta(c.champion_id)
        return meta?.cost === champCostFilter
      })
    }
    list.sort((a: any, b: any) => {
      const av = a[champSort] ?? 0, bv = b[champSort] ?? 0
      
      // For avg_placement, a lower number is actually a "higher" (better) rank
      if (champSort === 'avg_placement' || champSort === 'avg_star') {
          if (champSort === 'avg_placement') return champSortDir === 'desc' ? av - bv : bv - av;
      }
      return champSortDir === 'desc' ? bv - av : av - bv
    })
    return list
  }, [champStats, champSort, champSortDir, champCostFilter])

  const itemDataOrig = useMemo(() => {
    if (!itemStats.length) return []
    let list = [...itemStats]
    if (itemCategoryFilter) {
      list = list.filter((it: any) => {
        let cat: string = (categorizeItem(it.item_name) || 'Others') as string;
        if (cat === 'Components' || cat === 'Completed') cat = 'Completed';
        if (cat === 'Support') cat = 'Emblems'; // Or 'Support' depending on filters
        
        if (itemCategoryFilter === 'Others') {
          return !['Completed', 'Artifacts', 'Radiants', 'Emblems'].includes(cat);
        }
        return cat === itemCategoryFilter
      })
    }
    list.sort((a: any, b: any) => (b.usage_count ?? 0) - (a.usage_count ?? 0))
    return list
  }, [itemStats, itemCategoryFilter])

  const itemDataSorted = useMemo(() => {
    if (!itemStats.length) return []
    let list = [...itemStats]
    if (itemCategoryFilter) {
      list = list.filter((it: any) => {
        let cat: string = (categorizeItem(it.item_name) || 'Others') as string;
        if (cat === 'Components' || cat === 'Completed') cat = 'Completed';
        
        if (itemCategoryFilter === 'Others') {
          return !['Completed', 'Artifacts', 'Radiants', 'Emblems', 'Support'].includes(cat);
        }
        return cat === itemCategoryFilter || (itemCategoryFilter === 'Emblems' && cat === 'Support') // Analytics uses Emblems for Support items
      })
    }
    list.sort((a: any, b: any) => {
      const av = a[itemSort] ?? 0, bv = b[itemSort] ?? 0
      if (itemSort === 'avg_placement') return itemSortDir === 'desc' ? av - bv : bv - av;
      return itemSortDir === 'desc' ? bv - av : av - bv
    })
    return list
  }, [itemStats, itemSort, itemSortDir, itemCategoryFilter])

  const synergyItemsOrig = useMemo(() => {
    if (!itemChampStats.length) return []
    const unique = Array.from(new Set(itemChampStats.map(s => s.item_name)))
    const list = unique.map(id => {
       const def = itemsMeta.find(x => x.id === id)
       let cat: string = (categorizeItem(id) || 'Others') as string;
       if (cat === 'Components') cat = 'Completed'; // Map Components to Craftable/Completed category to show them if needed, or keep specific.
       return { id, name: def?.name || id.replace(/^TFT\d*?_Item_/, ''), category: cat, icon: def?.icon }
    })
    return list.sort((a,b) => a.name.localeCompare(b.name))
  }, [itemChampStats])

  const synergyItemsSorted = useMemo(() => {
    let list = [...synergyItemsOrig]
    if (itemCategoryFilter) {
      list = list.filter(it => {
        if (itemCategoryFilter === 'Others') return !['Completed', 'Artifacts', 'Radiants', 'Emblems'].includes(it.category || '');
        return it.category === itemCategoryFilter;
      })
    }
    return list
  }, [synergyItemsOrig, itemCategoryFilter])

  const synergyPairsDetail = useMemo(() => {
    if (!synergySelectedItem && synergyItemsSorted.length > 0) {
      // Auto-select first item if possible
      return itemChampStats.filter(x => x.item_name === synergyItemsSorted[0].id).slice(0, 100)
    }
    return itemChampStats.filter(x => x.item_name === synergySelectedItem).slice(0, 100)
  }, [itemChampStats, synergySelectedItem, synergyItemsSorted])

  const synergyChampionsOrig = useMemo(() => {
    if (!itemChampStats.length) return []
    const unique = Array.from(new Set(itemChampStats.map(s => s.champion_id)))
    const list = unique.map(id => {
       const def = getChampMeta(id)
       return { id, name: def?.name || id.replace(/^TFT\d*?_/, ''), cost: def?.cost || 1, icon: def?.icon }
    })
    return list.sort((a,b) => a.name.localeCompare(b.name))
  }, [itemChampStats, champsMeta])

  const synergyChampionsSorted = useMemo(() => {
    let list = [...synergyChampionsOrig]
    if (champCostFilter) {
      list = list.filter(c => c.cost === champCostFilter)
    }
    return list
  }, [synergyChampionsOrig, champCostFilter])

  const synergyChampDetails = useMemo(() => {
    if (!synergySelectedChampion && synergyChampionsSorted.length > 0) {
      return itemChampStats.filter(x => x.champion_id === synergyChampionsSorted[0].id).slice(0, 100)
    }
    return itemChampStats.filter(x => x.champion_id === synergySelectedChampion).slice(0, 100)
  }, [itemChampStats, synergySelectedChampion, synergyChampionsSorted])

  if (loading) return (
    <div className="an-loading" style={{ width: '100%', minHeight: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="an-spinner" />
      <p style={{ marginTop: '15px', color: PALETTE.subtext, fontWeight: 600 }}>Loading Data...</p>
      <AnalyticsStyles />
    </div>
  )

  const totalMatches = overview?.totals?.matches || 0
  const topPickedChamps = [...(champData || [])].sort((a: any, b: any) => (b.pick_rate ?? 0) - (a.pick_rate ?? 0))

  return (
    <div className="an-container">
      {/* ── Header ── */}
      <header className="an-topbar">
        <div>
          <h2 className="an-page-title">Analytics</h2>
          <div className="an-page-stats" style={{ marginTop: '5px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            {totalMatches.toLocaleString()} matches processed
          </div>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {patchList.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: PALETTE.subtext, fontSize: '14px', fontWeight: 500 }}>Patch</span>
              <select 
                value={selectedPatch} 
                onChange={e => setSelectedPatch(e.target.value)}
                style={{ 
                  background: '#2A2A33', color: '#fff', border: '1px solid #3F3F4A',
                  padding: '6px 12px', borderRadius: '4px', fontSize: '14px',
                  outline: 'none', cursor: 'pointer'
                }}
              >
                {patchList.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {patchSelectorLoading && <span style={{ color: PALETTE.subtext, fontSize: '12px' }}>Loading...</span>}
            </div>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="an-nav-pills">
        {(['Overview', 'Champions', 'Items', 'Synergy'] as TabKey[]).map(t => (
          <button key={t} className={`an-pill ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && (
        <>
          {/* ── KPI Row ── */}
          <div className="an-row an-kpi-row">
            {[
              { label: 'Champions Tracked', value: overview?.totals?.champions || 0 },
              { label: 'Items Tracked', value: overview?.totals?.items || itemStats.length },
              { label: 'Synergy Pairs', value: (overview?.stats?.item_champion_stats || 0).toLocaleString() },
              { label: 'Augments Tracked', value: overview?.totals?.augments || 0 },
            ].map((kpi, i) => (
              <div key={i} className="an-card an-kpi-card">
                <div className="an-kpi-content" style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                  <p className="an-kpi-label" style={{ marginBottom: '5px' }}>{kpi.label}</p>
                  <h3 className="an-kpi-val" style={{ margin: 0, fontSize: '32px' }}>{kpi.value}</h3>
                </div>
                <div className="an-card-footer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '6px'}}><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.44l5.66-2" /></svg>
                  Updated just now
                </div>
              </div>
            ))}
          </div>

          {/* ── Charts Row ── */}
          <div className="an-row an-charts-row">
            {/* Pick Rate Chart */}
            <div className="an-card">
              <div className="an-card-header">
                <h4 className="an-card-title">Champion Pick Rate</h4>
                <p className="an-card-category">Top 10 highest usage</p>
              </div>
              <div className="an-card-body">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topPickedChamps.slice(0, 10).map((c: any) => ({
                    name: getChampMeta(c.champion_id)?.name || c.champion_id.replace(/^TFT\d+_/, ''),
                    pick: c.pick_rate || 0
                  }))} margin={{ left: 0, right: 10, bottom: 0, top: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBEBEB" />
                    <XAxis dataKey="name" tick={{ fill: PALETTE.subtext, fontSize: 11 }} angle={-45} textAnchor="end" height={60} interval={0} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: PALETTE.subtext, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#F4F3EF' }} contentStyle={{ borderRadius: 6, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="pick" name="Pick %" fill={PALETTE.orange} radius={[2, 2, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="an-card-footer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                Global match stats
              </div>
            </div>

            {/* Item Usage Chart */}
            <div className="an-card">
              <div className="an-card-header">
                <h4 className="an-card-title">Item Usage Volume</h4>
                <p className="an-card-category">Most popular slammable items</p>
              </div>
              <div className="an-card-body">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={itemDataOrig.slice(0, 10).map((it: any) => ({
                    name: itemsMeta.find(i => i.id === it.item_name)?.name?.slice(0, 16) || it.item_name.replace('TFT_Item_', ''),
                    usage: it.usage_count,
                  }))} margin={{ left: 0, right: 10, bottom: 0, top: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBEBEB" />
                    <XAxis dataKey="name" tick={{ fill: PALETTE.subtext, fontSize: 11 }} angle={-45} textAnchor="end" height={60} interval={0} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: PALETTE.subtext, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#F4F3EF' }} contentStyle={{ borderRadius: 6, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="usage" name="Usage Count" fill={PALETTE.green} radius={[2, 2, 0, 0]} barSize={20}>
                      {itemDataOrig.slice(0, 10).map((_: any, idx: number) => (
                        <Cell key={idx} fill={idx < 3 ? PALETTE.green : PALETTE.yellow} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="an-card-footer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                Gathered directly from Riot API
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── CHAMPIONS LIST ── */}
      {tab === 'Champions' && (
        <div className="an-row">
          <div className="an-card" style={{ flex: 1 }}>
            <div className="an-card-header" style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <h4 className="an-card-title">Champion Analysis</h4>
                <p className="an-card-category">Deep dive into win rates and placements</p>
              </div>
              <div className="an-filters">
                <span style={{ fontSize: '13px', color: PALETTE.subtext, marginRight: '10px' }}>Cost:</span>
                {[1, 2, 3, 4, 5].map(cost => (
                  <button key={cost} className={`an-filter ${champCostFilter === cost ? 'active' : ''}`}
                    onClick={() => setChampCostFilter(cost)}>
                    {cost}✦
                  </button>
                ))}
              </div>
            </div>
            <div className="an-table-responsive">
              <table className="an-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>#</th>
                    <th>Champion</th>
                    <th style={{ width: '80px' }}>Cost</th>
                    <th style={{ width: '100px' }} className="an-sortable" onClick={() => toggleChampSort('games')}>Games{sortArrow(champSort === 'games', champSortDir)}</th>
                    <th style={{ width: '100px' }} className="an-sortable" onClick={() => toggleChampSort('pick_rate')}>Pick %{sortArrow(champSort === 'pick_rate', champSortDir)}</th>
                    <th style={{ width: '120px' }} className="an-sortable" onClick={() => toggleChampSort('avg_placement')}>Avg Place{sortArrow(champSort === 'avg_placement', champSortDir)}</th>
                    <th style={{ width: '100px' }} className="an-sortable" onClick={() => toggleChampSort('top4_rate')}>Top 4 %{sortArrow(champSort === 'top4_rate', champSortDir)}</th>
                    <th style={{ width: '100px' }} className="an-sortable" onClick={() => toggleChampSort('win_rate')}>Win %{sortArrow(champSort === 'win_rate', champSortDir)}</th>
                    <th style={{ width: '100px' }} className="an-sortable" onClick={() => toggleChampSort('avg_star')}>★ Avg{sortArrow(champSort === 'avg_star', champSortDir)}</th>
                  </tr>
                </thead>
                <tbody>
                  {champData.map((c: any, i: number) => {
                    const meta = getChampMeta(c.champion_id);
                    if (!meta) return null;
                    return (
                      <tr key={i}>
                        <td style={{ color: PALETTE.subtext }}>{i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <HexagonFrame color={COST_COLORS[meta.cost]} bg={COST_BG[meta.cost]} size={30} padding={1}>
                              <ChampionAvatar id={meta.id} name={meta.name} icon={meta.icon} shape="hexagon" className="w-[26px] h-[26px]" />
                            </HexagonFrame>
                            {meta.name}
                          </div>
                        </td>
                        <td style={{ color: COST_COLORS[meta.cost], fontWeight: 'bold' }}>{meta.cost}✦</td>
                        <td>{c.games}</td>
                        <td><span style={{ color: c.pick_rate >= 15 ? PALETTE.orange : 'inherit' }}>{c.pick_rate}%</span></td>
                        <td><span style={{ color: c.avg_placement <= 4.0 ? PALETTE.green : c.avg_placement >= 4.8 ? PALETTE.orange : 'inherit' }}>{c.avg_placement}</span></td>
                        <td><span style={{ color: c.top4_rate >= 55 ? PALETTE.green : 'inherit' }}>{c.top4_rate}%</span></td>
                        <td><span style={{ color: c.win_rate >= 14 ? PALETTE.green : 'inherit' }}>{c.win_rate}%</span></td>
                        <td>{c.avg_star}★</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ITEMS LIST ── */}
      {tab === 'Items' && (
        <div className="an-row">
          <div className="an-card" style={{ flex: 1 }}>
            <div className="an-card-header" style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <h4 className="an-card-title">Item Analysis</h4>
                <p className="an-card-category">Performance metrics for completed items and components</p>
              </div>
              <div className="an-filters">
                <span style={{ fontSize: '13px', color: PALETTE.subtext, marginRight: '10px' }}>Category:</span>
                {['Completed', 'Artifacts', 'Radiants', 'Emblems', 'Others'].map(cat => (
                  <button key={cat} className={`an-filter ${itemCategoryFilter === cat ? 'active' : ''}`}
                    onClick={() => setItemCategoryFilter(cat)}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="an-table-responsive">
              <table className="an-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>#</th>
                    <th>Item</th>
                    <th style={{ width: '150px' }} className="an-sortable" onClick={() => toggleItemSort('usage_count')}>Usage{sortArrow(itemSort === 'usage_count', itemSortDir)}</th>
                    <th style={{ width: '150px' }} className="an-sortable" onClick={() => toggleItemSort('avg_placement')}>Avg Place{sortArrow(itemSort === 'avg_placement', itemSortDir)}</th>
                    <th style={{ width: '150px' }} className="an-sortable" onClick={() => toggleItemSort('top4_rate')}>Top 4 %{sortArrow(itemSort === 'top4_rate', itemSortDir)}</th>
                    <th style={{ width: '150px' }} className="an-sortable" onClick={() => toggleItemSort('win_rate')}>Win %{sortArrow(itemSort === 'win_rate', itemSortDir)}</th>
                  </tr>
                </thead>
                <tbody>
                  {itemDataSorted.map((it: any, i: number) => {
                    const itemDef = itemsMeta.find(x => x.id === it.item_name)
                    const top4Display = it.top4_rate >= 1 ? it.top4_rate : (it.top4_rate * 100)
                    const winDisplay = it.win_rate >= 1 ? it.win_rate : (it.win_rate ? (it.win_rate * 100) : 0)
                    return (
                      <tr key={i}>
                        <td style={{ color: PALETTE.subtext }}>{i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <SpriteIcon type="item" id={it.item_name} icon={itemDef?.icon} className="w-[28px] h-[28px] min-w-[28px] object-cover rounded border border-[#EBEBEB] bg-black" alt={itemDef?.name || 'Item'} />
                            {itemDef?.name || it.item_name.replace('TFT_Item_', '')}
                          </div>
                        </td>
                        <td>{it.usage_count}</td>
                        <td><span style={{ color: it.avg_placement <= 4.1 ? PALETTE.green : it.avg_placement >= 4.6 ? PALETTE.orange : 'inherit' }}>{it.avg_placement?.toFixed(2)}</span></td>
                        <td><span style={{ color: top4Display >= 55 ? PALETTE.green : 'inherit' }}>{top4Display.toFixed(1)}%</span></td>
                        <td><span style={{ color: winDisplay >= 14 ? PALETTE.green : 'inherit' }}>{winDisplay.toFixed(1)}%</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ITEM-CHAMPION SYNERGY ── */}
      {tab === 'Synergy' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', padding: '0 15px' }}>
            <button className={`an-pill ${synergyPivot === 'item' ? 'active' : ''}`} onClick={() => setSynergyPivot('item')}>Group by Item</button>
            <button className={`an-pill ${synergyPivot === 'champion' ? 'active' : ''}`} onClick={() => setSynergyPivot('champion')}>Group by Champion</button>
          </div>
          <div className="an-row" style={{ alignItems: 'flex-start' }}>
            
            {/* Left Panel: Selector with Filter */}
            <div className="an-card" style={{ width: '500px', flexShrink: 0 }}>
              <div className="an-card-header" style={{ marginBottom: '15px' }}>
                <h4 className="an-card-title">{synergyPivot === 'item' ? 'Select Item' : 'Select Champion'}</h4>
              </div>
              <div className="an-filters" style={{ padding: '0 20px', marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {synergyPivot === 'item' ? (
                  ['Completed', 'Artifacts', 'Radiants', 'Emblems', 'Others'].map(cat => (
                    <button key={cat} className={`an-filter ${itemCategoryFilter === cat ? 'active' : ''}`}
                      onClick={() => setItemCategoryFilter(cat)}>
                      {cat}
                    </button>
                  ))
                ) : (
                  [1, 2, 3, 4, 5].map(cost => (
                    <button key={cost} className={`an-filter ${champCostFilter === cost ? 'active' : ''}`}
                      onClick={() => setChampCostFilter(cost)}>
                      {cost}✦
                    </button>
                  ))
                )}
              </div>
              <div className="an-table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <table className="an-table">
                  <colgroup>
                    <col style={{ width: '60px' }} />
                    <col />
                  </colgroup>
                  <tbody>
                    {synergyPivot === 'item' && synergyItemsSorted.map((si, i) => {
                      const isSelected = synergySelectedItem ? synergySelectedItem === si.id : i === 0
                      return (
                        <tr 
                          key={si.id} 
                          style={{ cursor: 'pointer', background: isSelected ? 'rgba(235,94,40,0.05)' : 'transparent' }}
                          onClick={() => setSynergySelectedItem(si.id)}
                        >
                          <td style={{ width: '40px' }}>
                            <SpriteIcon type="item" id={si.id} icon={(si as any).icon} className="w-[28px] h-[28px] min-w-[28px] object-cover rounded border border-[#EBEBEB] bg-black" alt={si.name} />
                          </td>
                          <td style={{ fontWeight: isSelected ? 600 : 400 }}>{si.name}</td>
                        </tr>
                      )
                    })}
                    {synergyPivot === 'champion' && synergyChampionsSorted.map((sc, i) => {
                      const isSelected = synergySelectedChampion ? synergySelectedChampion === sc.id : i === 0
                      return (
                        <tr 
                          key={sc.id} 
                          style={{ cursor: 'pointer', background: isSelected ? 'rgba(235,94,40,0.05)' : 'transparent' }}
                          onClick={() => setSynergySelectedChampion(sc.id)}
                        >
                          <td style={{ width: '40px' }}>
                            <HexagonFrame color={COST_COLORS[sc.cost]} bg={COST_BG[sc.cost]} size={28} padding={1}>
                              <ChampionAvatar id={sc.id} name={sc.name} icon={(sc as any).icon} shape="hexagon" className="w-[24px] h-[24px]" />
                            </HexagonFrame>
                          </td>
                          <td style={{ fontWeight: isSelected ? 600 : 400 }}>{sc.name}</td>
                        </tr>
                      )
                    })}
                    {(synergyPivot === 'item' && synergyItemsSorted.length === 0) || (synergyPivot === 'champion' && synergyChampionsSorted.length === 0) ? (
                      <tr><td colSpan={2} style={{ textAlign: 'center', color: PALETTE.subtext, padding: '20px' }}>No entries found</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Panel: Synergy Details */}
            <div className="an-card" style={{ flex: 1 }}>
              <div className="an-card-header" style={{ marginBottom: '15px' }}>
                <h4 className="an-card-title">{synergyPivot === 'item' ? 'Champion Usage Details' : 'Item Usage Details'}</h4>
                <p className="an-card-category">{synergyPivot === 'item' ? 'Win rates and placement data for champions equipping this item' : 'Win rates and placement data for items equipped by this champion'}</p>
              </div>
              {(synergyPivot === 'item' && synergyPairsDetail.length === 0) || (synergyPivot === 'champion' && synergyChampDetails.length === 0) ? (
                <div className="an-card-body" style={{ textAlign: 'center', padding: '40px' }}>
                  <p style={{ color: PALETTE.subtext }}>No synergy data for selection. Run aggregation first.</p>
                </div>
              ) : (
                <div className="an-table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <table className="an-table">
                    <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                      <tr>
                        <th style={{ width: '50px' }}>#</th>
                        <th>{synergyPivot === 'item' ? 'Champion' : 'Item'}</th>
                        <th style={{ width: '100px' }}>Games</th>
                        <th style={{ width: '120px' }}>Avg Place</th>
                        <th style={{ width: '100px' }}>Top 4 %</th>
                        <th style={{ width: '100px' }}>Win %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {synergyPivot === 'item' && synergyPairsDetail.map((row: any, i: number) => {
                        const champMeta = getChampMeta(row.champion_id)
                        return (
                          <tr key={i}>
                            <td style={{ color: PALETTE.subtext }}>{i + 1}</td>
                            <td>
                              {champMeta ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <HexagonFrame color={COST_COLORS[champMeta.cost]} bg={COST_BG[champMeta.cost]} size={24} padding={1}>
                                    <ChampionAvatar id={champMeta.id} name={champMeta.name} icon={champMeta.icon} shape="hexagon" className="w-[20px] h-[20px]" />
                                  </HexagonFrame>
                                  {champMeta.name}
                                </div>
                              ) : row.champion_id.replace(/^TFT\d+_/, '')}
                            </td>
                            <td>{row.games}</td>
                            <td><span style={{ color: row.avg_placement <= 4.0 ? PALETTE.green : row.avg_placement >= 4.8 ? PALETTE.orange : 'inherit' }}>{row.avg_placement}</span></td>
                            <td><span style={{ color: row.top4_rate >= 55 ? PALETTE.green : 'inherit' }}>{row.top4_rate}%</span></td>
                            <td><span style={{ color: row.win_rate >= 14 ? PALETTE.green : 'inherit' }}>{row.win_rate}%</span></td>
                          </tr>
                        )
                      })}
                      {synergyPivot === 'champion' && synergyChampDetails.map((row: any, i: number) => {
                        const itemDef = itemsMeta.find(x => x.id === row.item_name)
                        return (
                          <tr key={i}>
                            <td style={{ color: PALETTE.subtext }}>{i + 1}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <SpriteIcon type="item" id={row.item_name} icon={itemDef?.icon} className="w-[24px] h-[24px] min-w-[24px] object-cover rounded border border-[#EBEBEB] bg-black" alt={itemDef?.name || 'Item'} />
                                {itemDef?.name || row.item_name.replace('TFT_Item_', '')}
                              </div>
                            </td>
                            <td>{row.games}</td>
                            <td><span style={{ color: row.avg_placement <= 4.0 ? PALETTE.green : row.avg_placement >= 4.8 ? PALETTE.orange : 'inherit' }}>{row.avg_placement}</span></td>
                            <td><span style={{ color: row.top4_rate >= 55 ? PALETTE.green : 'inherit' }}>{row.top4_rate}%</span></td>
                            <td><span style={{ color: row.win_rate >= 14 ? PALETTE.green : 'inherit' }}>{row.win_rate}%</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AnalyticsStyles />
    </div>
  )
}

function AnalyticsStyles() {
  return <style>{`
    .an-container {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding-bottom: 40px;
    }

    .an-spinner { width: 40px; height: 40px; border: 3px solid rgba(235,94,40,0.2); border-top-color: #EB5E28; border-radius: 50%; animation: an-spin 0.8s linear infinite; }
    @keyframes an-spin { to { transform: rotate(360deg); } }

    /* Topbar */
    .an-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
      padding: 0 5px;
    }

    .an-page-title {
      margin: 0;
      color: #252422;
      font-size: 26px;
      font-weight: 300;
      text-transform: capitalize;
    }

    .an-page-stats {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #9A9A9A;
      font-size: 14px;
      font-weight: 400;
    }

    /* Tabs / Pills */
    .an-nav-pills {
       display: flex;
       gap: 10px;
       margin-bottom: 25px;
       padding: 0 5px;
    }

    .an-pill {
       background: transparent;
       border: 1px solid #DDDDDD;
       border-radius: 20px;
       padding: 8px 18px;
       font-size: 13px;
       font-weight: 600;
       color: #66615B;
       cursor: pointer;
       transition: all 0.2s ease;
       text-transform: uppercase;
       letter-spacing: 0.5px;
    }

    .an-pill:hover {
       background: #F4F3EF;
       color: #252422;
    }

    .an-pill.active {
       background: #68B3C8;
       color: #FFFFFF;
       border-color: #68B3C8;
    }

    /* Layout Rows */
    .an-row {
      display: flex;
      flex-wrap: wrap;
      margin: 0 -15px;
    }

    .an-row > * {
      padding: 0 15px;
    }

    .an-kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      margin-bottom: 20px;
    }

    .an-charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      margin-bottom: 20px;
    }

    /* Base Card Style matching Paper Dashboard */
    .an-card {
      background-color: #FFFFFF;
      border-radius: 6px;
      box-shadow: 0 2px 2px rgba(204, 197, 185, 0.5);
      color: #252422;
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    /* KPI Card specifics */
    .an-kpi-card {
      padding: 20px;
    }

    .an-kpi-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .an-kpi-label {
      margin: 0;
      color: #9A9A9A;
      font-size: 14px;
      font-weight: 400;
    }

    .an-kpi-val {
      margin: 5px 0 0;
      font-size: 28px;
      color: #252422;
      font-weight: 300;
    }

    /* Standard Card specifics */
    .an-card-header {
      padding: 20px 20px 0;
    }

    .an-card-title {
      margin: 0;
      color: #252422;
      font-size: 18px;
      font-weight: 300;
    }

    .an-card-category {
      margin: 5px 0 0;
      color: #9A9A9A;
      font-size: 14px;
      font-weight: 400;
    }

    .an-card-body {
      padding: 15px 20px;
      position: relative;
    }

    .an-card-footer {
      padding: 15px 20px;
      border-top: 1px solid #F1EAE0;
      background-color: transparent;
      color: #A9A9A9;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: auto;
    }

    /* Table specifics */
    .an-table td span { font-weight: 600; }
    
    .an-table-responsive {
       overflow-x: auto;
       width: 100%;
       padding-bottom: 10px;
    }
    
    .an-table {
       width: 100%;
       max-width: 100%;
       border-collapse: collapse;
       table-layout: fixed;
    }
    
    .an-table th {
       background-color: #FFFFFF;
       color: #9A9A9A;
       padding: 12px 15px;
       border-bottom: 2px solid #F1EAE0;
       text-align: left;
       font-size: 12px;
       font-weight: 600;
       letter-spacing: 0.5px;
       text-transform: uppercase;
    }
    
    .an-table td {
       padding: 12px 15px;
       border-bottom: 1px solid #F1EAE0;
       color: #252422;
       font-size: 14px;
    }
    
    .an-sortable {
       cursor: pointer;
    }
    .an-sortable:hover {
       color: #66615B;
    }

    .an-table tbody tr:hover {
       background-color: rgba(244,243,239, 0.4); 
    }

    .an-filters {
       display: flex;
       gap: 5px;
       align-items: center;
    }

    .an-filter {
       background: transparent;
       border: 1px solid transparent;
       color: #9A9A9A;
       padding: 4px 10px;
       border-radius: 4px;
       font-size: 13px;
       cursor: pointer;
    }
    .an-filter:hover { background: #F4F3EF; }
    .an-filter.active { background: #68B3C8; color: #fff; }

    @media (max-width: 1200px) {
      .an-kpi-row, .an-charts-row { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 768px) {
      .an-kpi-row, .an-charts-row { grid-template-columns: 1fr; }
      .an-nav-pills { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 5px; }
      .an-pill { white-space: nowrap; }
    }
  `}</style>
}
