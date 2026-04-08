'use client'

import { useState, useCallback, useEffect } from 'react'
import { ActionCard } from '@/components/admin/ActionCard'
import { SyncConsole } from '@/components/admin/SyncConsole'
import { useAdminSet } from '@/components/admin/AdminSetContext'

interface SyncJob {
  id: string
  job_type: string
  set_prefix: string
  ddragon_version: string
  status: string
  champion_count: number | null
  trait_count: number | null
  augment_count: number | null
  item_count: number | null
  started_at: string
  finished_at: string | null
}

interface ManagedSet {
  prefix: string
  label: string
  env: string
  created_at: string
  is_active: boolean
  has_data: boolean
  counts: { champions: number; traits: number; augments: number; items: number }
  source: 'managed' | 'discovered'
}

interface Props {
  recentJobs: SyncJob[]
}

type Source = 'cdragon' | 'ddragon'
type CDragonEnv = 'latest' | 'pbe'

interface SourceConfig {
  champions: Source
  traits: Source
  augments: Source
  items: Source
}

const ENTITY_TYPES = ['champions', 'traits', 'augments', 'items'] as const
const ENTITY_LABELS: Record<string, string> = {
  champions: '🎯 Champions',
  traits: '🏷️ Traits',
  augments: '⚡ Augments',
  items: '🗡️ Items',
}

export function SyncPageClient({ recentJobs: initialJobs }: Props) {
  const [setPrefix, setSetPrefix] = useState('TFT16')
  const [ddVersion, setDdVersion] = useState('')
  const [cdragonSource, setCdragonSource] = useState<CDragonEnv>('latest')
  const [sources, setSources] = useState<SourceConfig>({
    champions: 'cdragon',
    traits: 'cdragon',
    augments: 'ddragon',
    items: 'ddragon',
  })
  const [availableSets, setAvailableSets] = useState<string[]>([])

  const [unifiedRunning, setUnifiedRunning] = useState(false)
  const [unifiedJobId, setUnifiedJobId] = useState<string | null>(null)
  const [unifiedStatus, setUnifiedStatus] = useState<'completed' | 'error' | null>(null)

  const [jobs, setJobs] = useState<SyncJob[]>(initialJobs)

  // Pipeline state
  const [pipelineRunning, setPipelineRunning] = useState(false)
  const [pipelineJobId, setPipelineJobId] = useState<string | null>(null)
  const [pipelineStatus, setPipelineStatus] = useState<'completed' | 'error' | null>(null)
  const [pipelineRegions, setPipelineRegions] = useState<string[]>(['na1', 'euw1', 'vn2'])
  const [pipelineMaxMatches, setPipelineMaxMatches] = useState('20')
  const [pipelineSetNumber, setPipelineSetNumber] = useState('16')
  const [pipelineMaxPlayers, setPipelineMaxPlayers] = useState('50')

  // Aggregation state
  const [aggRunning, setAggRunning] = useState(false)

  // Patch Crawler State
  const [crawlRunning, setCrawlRunning] = useState(false)
  const [crawlJobId, setCrawlJobId] = useState<string | null>(null)
  const [crawlStatus, setCrawlStatus] = useState<'completed' | 'error' | null>(null)
  const [crawlUrl, setCrawlUrl] = useState('')

  // Log Viewer
  const [viewingLog, setViewingLog] = useState<{ id: string, content: string | null } | null>(null)
  const [loadingLog, setLoadingLog] = useState(false)

  // ── Set Manager State ──────────────────────────────────────────────
  const [managedSets, setManagedSets] = useState<ManagedSet[]>([])
  const [activeSetPrefix, setActiveSetPrefix] = useState('TFT16')
  const [setsLoading, setSetsLoading] = useState(true)
  const [showAddSet, setShowAddSet] = useState(false)
  const [newSetPrefix, setNewSetPrefix] = useState('')
  const [newSetLabel, setNewSetLabel] = useState('')
  const [newSetEnv, setNewSetEnv] = useState<'pbe' | 'live'>('pbe')
  const [addingSet, setAddingSet] = useState(false)
  const [confirmPurge, setConfirmPurge] = useState<string | null>(null)

  const { refreshSets: adminRefreshSets } = useAdminSet()

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  // ── Fetch Sets ──────────────────────────────────────────────────────
  const fetchSets = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/sets`)
      const data = await res.json()
      if (data.sets) setManagedSets(data.sets)
      if (data.active_set) setActiveSetPrefix(data.active_set)
      adminRefreshSets()
    } catch (err) {
      console.error('Failed to fetch sets:', err)
    } finally {
      setSetsLoading(false)
    }
  }, [apiUrl])

  // Auto-detect patch + available sets
  useEffect(() => {
    // Fetch managed sets
    fetchSets()

    // Fetch available sets (legacy)
    fetch(`${apiUrl}/api/meta/sets`)
      .then(r => r.json())
      .then((sets: string[]) => {
        if (sets?.length) setAvailableSets(sets)
      })
      .catch(() => {})

    // Auto-detect latest patch
    fetch(`${apiUrl}/api/meta/stats/patches`)
      .then(r => r.json())
      .then((patches: string[]) => {
        if (patches && patches.length > 0) {
          const latestPatch = patches[0]
          setDdVersion(`${latestPatch}.1`)
          const major = parseInt(latestPatch.split('.')[0])
          if (major) {
            setPipelineSetNumber(major.toString())
            setSetPrefix(`TFT${major}`)
          }
        }
      })
      .catch(err => console.error('Failed to auto-detect patch:', err))
  }, [apiUrl, fetchSets])

  // ── Set Manager Actions ────────────────────────────────────────────
  async function handleAddSet() {
    if (!newSetPrefix.trim()) return
    setAddingSet(true)
    try {
      const res = await fetch(`${apiUrl}/api/admin/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefix: newSetPrefix.toUpperCase().trim(),
          label: newSetLabel.trim() || undefined,
          env: newSetEnv,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add set')
      setNewSetPrefix('')
      setNewSetLabel('')
      setNewSetEnv('pbe')
      setShowAddSet(false)
      fetchSets()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to add set')
    } finally {
      setAddingSet(false)
    }
  }

  async function handleActivateSet(prefix: string) {
    try {
      const res = await fetch(`${apiUrl}/api/admin/sets/${prefix}/activate`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to activate')
      fetchSets()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to activate set')
    }
  }

  async function handleDeleteSet(prefix: string) {
    try {
      const res = await fetch(`${apiUrl}/api/admin/sets/${prefix}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      fetchSets()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete set')
    }
  }

  async function handlePurgeSet(prefix: string) {
    try {
      const res = await fetch(`${apiUrl}/api/admin/sets/${prefix}/purge`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to purge')
      alert(`✅ Purged ${prefix}: ${data.deleted.champions} champions, ${data.deleted.traits} traits, ${data.deleted.augments} augments, ${data.deleted.items} items`)
      setConfirmPurge(null)
      fetchSets()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to purge set data')
    }
  }

  function handleSelectSetForSync(prefix: string) {
    setSetPrefix(prefix)
    const num = prefix.replace(/\D/g, '')
    if (num) setPipelineSetNumber(num)
  }

  function updateSource(entity: keyof SourceConfig, value: Source) {
    setSources(prev => ({ ...prev, [entity]: value }))
  }

  // ── Unified Sync ────────────────────────────────────────────────────
  async function handleUnifiedSync() {
    setUnifiedRunning(true)
    setUnifiedStatus(null)
    setUnifiedJobId(null)

    try {
      const res = await fetch(`${apiUrl}/api/admin/sync/unified/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          set_prefix: setPrefix,
          ddragon_version: ddVersion,
          cdragon_source: cdragonSource,
          sources,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start unified sync')
      setUnifiedJobId(data.job_id)
    } catch (err: unknown) {
      alert(`Could not start sync: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setUnifiedRunning(false)
    }
  }

  const handleUnifiedDone = useCallback((status: 'completed' | 'error') => {
    setUnifiedRunning(false)
    setUnifiedStatus(status)
    setJobs(prev => {
      const existing = prev.find(j => j.id === unifiedJobId)
      const srcLabel = `${sources.champions === 'cdragon' ? 'cd' : 'dd'}/${sources.traits === 'cdragon' ? 'cd' : 'dd'}/${sources.augments === 'cdragon' ? 'cd' : 'dd'}/${sources.items === 'cdragon' ? 'cd' : 'dd'}`
      const newJob: SyncJob = {
        id: unifiedJobId!,
        job_type: 'unified',
        set_prefix: setPrefix,
        ddragon_version: `unified-${srcLabel}`,
        status,
        champion_count: null, trait_count: null, augment_count: null, item_count: null,
        started_at: existing ? existing.started_at : new Date().toISOString(),
        finished_at: new Date().toISOString(),
      }
      return existing ? prev.map(j => j.id === unifiedJobId ? newJob : j) : [newJob, ...prev].slice(0, 10)
    })

    // Refresh available sets after sync
    if (status === 'completed') {
      fetchSets()
      fetch(`${apiUrl}/api/meta/sets`)
        .then(r => r.json())
        .then((sets: string[]) => { if (sets?.length) setAvailableSets(sets) })
        .catch(() => {})
    }
  }, [unifiedJobId, setPrefix, sources, apiUrl, fetchSets])

  // ── Pipeline ────────────────────────────────────────────────────────
  async function handlePipeline() {
    setPipelineRunning(true)
    setPipelineStatus(null)
    setPipelineJobId(null)

    try {
      const res = await fetch(`${apiUrl}/api/admin/pipeline/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regions: pipelineRegions,
          queue_ids: [1100],
          max_matches: parseInt(pipelineMaxMatches, 10),
          max_players: parseInt(pipelineMaxPlayers, 10),
          tft_set_number: parseInt(pipelineSetNumber, 10),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start pipeline')
      setPipelineJobId(data.job_id)
    } catch (err: unknown) {
      alert(`Could not start pipeline: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setPipelineRunning(false)
    }
  }

  const handlePipelineDone = useCallback((status: 'completed' | 'error') => {
    setPipelineRunning(false)
    setPipelineStatus(status)
    setJobs(prev => {
      const existing = prev.find(j => j.id === pipelineJobId)
      const newJob: SyncJob = {
        id: pipelineJobId!,
        job_type: 'pipeline',
        set_prefix: `TFT${pipelineSetNumber}`,
        ddragon_version: 'live',
        status,
        champion_count: null, trait_count: null, augment_count: null, item_count: null,
        started_at: existing ? existing.started_at : new Date().toISOString(),
        finished_at: new Date().toISOString(),
      }
      return existing ? prev.map(j => j.id === pipelineJobId ? newJob : j) : [newJob, ...prev].slice(0, 10)
    })
  }, [pipelineJobId, pipelineSetNumber])

  function toggleRegion(r: string) {
    setPipelineRegions(prev =>
      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
    )
  }

  async function handleAggregate() {
    setAggRunning(true)
    try {
      const res = await fetch(`${apiUrl}/api/admin/pipeline/aggregate`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to aggregate')
      alert(`✅ Aggregation complete! Patches: ${data.patches?.join(', ')}`)
    } catch (err: unknown) {
      alert(`Could not aggregate: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setAggRunning(false)
    }
  }

  // ── Patch Crawler ──────────────────────────────────────────────────
  async function handleCrawl() {
    setCrawlRunning(true)
    setCrawlJobId(null)
    setCrawlStatus(null)

    try {
      const res = await fetch(`${apiUrl}/api/admin/patch-notes/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           ...(crawlUrl ? { url: crawlUrl } : {}),
           set_prefix: setPrefix
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start crawl')
      setCrawlJobId(data.job_id)
    } catch (err: unknown) {
      alert(`Could not start crawl: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setCrawlRunning(false)
    }
  }

  const handleCrawlDone = useCallback((status: 'completed' | 'error') => {
    setCrawlRunning(false)
    setCrawlStatus(status)
    setJobs(prev => {
      const existing = prev.find(j => j.id === crawlJobId)
      const newJob: SyncJob = {
        id: crawlJobId!,
        job_type: 'patch_crawl',
        set_prefix: 'patch-notes',
        ddragon_version: 'live',
        status,
        champion_count: null, trait_count: null, augment_count: null, item_count: null,
        started_at: existing ? existing.started_at : new Date().toISOString(),
        finished_at: new Date().toISOString(),
      }
      return existing ? prev.map(j => j.id === crawlJobId ? newJob : j) : [newJob, ...prev].slice(0, 10)
    })
  }, [crawlJobId])

  async function fetchAndShowLog(jobId: string) {
    setViewingLog({ id: jobId, content: null })
    setLoadingLog(true)

    try {
      const res = await fetch(`${apiUrl}/api/admin/sync/logs/${jobId}`)
      const data = await res.json()
      setViewingLog({ id: jobId, content: data?.log_output || 'No log output found for this job.' })
    } catch {
      setViewingLog({ id: jobId, content: 'Failed to fetch log output from Backend.' })
    }
    setLoadingLog(false)
  }

  // Check if any entity uses a specific source
  const usesSource = (s: Source) => Object.values(sources).some(v => v === s)

  return (
    <div className="sync-page">
      <div className="sync-header">
        <h2 className="sync-heading">Data Sync</h2>
        <p className="sync-sub">Manage sets, configure data sources, then sync.</p>
      </div>

      {/* ── Set Manager Card ─────────────────────────────────────── */}
      <div className="set-manager-card" id="set-manager-card">
        <div className="sm-header">
          <div className="sm-header-left">
            <h3 className="sm-title">🗂️ Set Manager</h3>
            <span className="sm-active-badge">Active: {activeSetPrefix}</span>
          </div>
          <button
            className="sm-add-btn"
            onClick={() => setShowAddSet(!showAddSet)}
          >
            {showAddSet ? '✕ Cancel' : '+ Add New Set'}
          </button>
        </div>

        <p className="sm-desc">Register TFT sets before syncing data. Sets discovered from existing DB data are shown automatically.</p>

        {/* Add New Set Form */}
        {showAddSet && (
          <div className="sm-add-form">
            <div className="sm-form-row">
              <div className="config-field">
                <label className="config-label">Set Prefix *</label>
                <input
                  className="config-input"
                  value={newSetPrefix}
                  onChange={e => setNewSetPrefix(e.target.value.toUpperCase())}
                  placeholder="TFT17"
                  disabled={addingSet}
                />
              </div>
              <div className="config-field">
                <label className="config-label">Display Label</label>
                <input
                  className="config-input"
                  value={newSetLabel}
                  onChange={e => setNewSetLabel(e.target.value)}
                  placeholder="Set 17 — Godfrey"
                  disabled={addingSet}
                />
              </div>
              <div className="config-field">
                <label className="config-label">Environment</label>
                <div className="env-toggle">
                  <button
                    className={`env-btn ${newSetEnv === 'pbe' ? 'active pbe' : ''}`}
                    onClick={() => setNewSetEnv('pbe')}
                    disabled={addingSet}
                  >🟡 PBE</button>
                  <button
                    className={`env-btn ${newSetEnv === 'live' ? 'active live' : ''}`}
                    onClick={() => setNewSetEnv('live')}
                    disabled={addingSet}
                  >🟢 Live</button>
                </div>
              </div>
              <div className="config-field" style={{ justifyContent: 'flex-end' }}>
                <button
                  className="sm-submit-btn"
                  onClick={handleAddSet}
                  disabled={addingSet || !newSetPrefix.trim()}
                >
                  {addingSet ? '⏳ Adding...' : '✅ Add Set'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sets List */}
        {setsLoading ? (
          <div className="sm-loading">Loading sets...</div>
        ) : managedSets.length === 0 ? (
          <div className="sm-empty">No sets registered yet. Click &quot;+ Add New Set&quot; to get started.</div>
        ) : (
          <div className="sm-sets-grid">
            {managedSets.map(set => (
              <div
                key={set.prefix}
                className={`sm-set-card ${set.is_active ? 'active' : ''} ${set.has_data ? 'has-data' : 'no-data'}`}
              >
                <div className="sm-set-top">
                  <div className="sm-set-info">
                    <span className="sm-set-prefix">{set.prefix}</span>
                    <span className="sm-set-label">{set.label}</span>
                  </div>
                  <div className="sm-set-badges">
                    <span className={`sm-env-tag ${set.env}`}>
                      {set.env === 'pbe' ? '🟡 PBE' : '🟢 Live'}
                    </span>
                    {set.is_active && <span className="sm-active-tag">⭐ Active</span>}
                    {set.source === 'discovered' && <span className="sm-discovered-tag">🔍 Auto</span>}
                  </div>
                </div>

                {/* Entity Counts */}
                <div className="sm-set-counts">
                  <div className="sm-count-item">
                    <span className="sm-count-num">{set.counts.champions}</span>
                    <span className="sm-count-label">Champions</span>
                  </div>
                  <div className="sm-count-item">
                    <span className="sm-count-num">{set.counts.traits}</span>
                    <span className="sm-count-label">Traits</span>
                  </div>
                  <div className="sm-count-item">
                    <span className="sm-count-num">{set.counts.augments}</span>
                    <span className="sm-count-label">Augments</span>
                  </div>
                  <div className="sm-count-item">
                    <span className="sm-count-num">{set.counts.items}</span>
                    <span className="sm-count-label">Items</span>
                  </div>
                </div>

                {/* Set Actions */}
                <div className="sm-set-actions">
                  <button
                    className="sm-action-btn sync-btn"
                    onClick={() => handleSelectSetForSync(set.prefix)}
                    title="Select this set for sync"
                  >
                    🚀 Sync This
                  </button>
                  {!set.is_active && (
                    <button
                      className="sm-action-btn activate-btn"
                      onClick={() => handleActivateSet(set.prefix)}
                      title="Set as active (public-facing)"
                    >
                      ⭐ Activate
                    </button>
                  )}
                  {set.source === 'managed' && (
                    <button
                      className="sm-action-btn delete-btn"
                      onClick={() => handleDeleteSet(set.prefix)}
                      title="Remove from registry (keeps DB data)"
                    >
                      🗑️
                    </button>
                  )}
                  {set.has_data && (
                    confirmPurge === set.prefix ? (
                      <div className="sm-purge-confirm">
                        <span className="purge-warning">Delete ALL data?</span>
                        <button className="sm-action-btn purge-yes" onClick={() => handlePurgeSet(set.prefix)}>Yes, Purge</button>
                        <button className="sm-action-btn purge-no" onClick={() => setConfirmPurge(null)}>Cancel</button>
                      </div>
                    ) : (
                      <button
                        className="sm-action-btn purge-btn"
                        onClick={() => setConfirmPurge(set.prefix)}
                        title="Delete all DB data for this set"
                      >
                        💀 Purge
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sync-actions">
        {/* ── Unified Data Sync Card ─────────────────────────────── */}
        <div className="action-card unified-card" id="unified-sync-card">
          <div className="ac-body">
            <div className="ac-header">
              <h3 className="ac-title">📦 Data Sync</h3>
              <span className={`ac-badge ${unifiedRunning ? 'badge-running' : ''}`}>
                {unifiedRunning ? '⏳ Syncing...' : 'READY'}
              </span>
            </div>
            <p className="ac-desc">Mix & match data sources per entity type for optimal results.</p>

            {/* Set Prefix */}
            <div className="unified-config-row">
              <div className="config-field">
                <label htmlFor="set-prefix-input" className="config-label">Set Prefix</label>
                <div className="set-prefix-combo">
                  <input
                    id="set-prefix-input"
                    className="config-input"
                    value={setPrefix}
                    onChange={e => setSetPrefix(e.target.value.toUpperCase().trim())}
                    placeholder="TFT16"
                    list="available-sets-list"
                    disabled={unifiedRunning}
                  />
                  <datalist id="available-sets-list">
                    {availableSets.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Source Config Table */}
            <div className="source-table-wrap">
              <table className="source-table">
                <thead>
                  <tr>
                    <th>Entity</th>
                    <th>Source</th>
                    <th>Config</th>
                  </tr>
                </thead>
                <tbody>
                  {ENTITY_TYPES.map(entity => (
                    <tr key={entity}>
                      <td className="entity-name">{ENTITY_LABELS[entity]}</td>
                      <td>
                        <div className="source-toggle">
                          <button
                            className={`src-btn ${sources[entity] === 'cdragon' ? 'active cdragon' : ''}`}
                            onClick={() => updateSource(entity, 'cdragon')}
                            disabled={unifiedRunning}
                          >
                            CDragon
                          </button>
                          <button
                            className={`src-btn ${sources[entity] === 'ddragon' ? 'active ddragon' : ''}`}
                            onClick={() => updateSource(entity, 'ddragon')}
                            disabled={unifiedRunning}
                          >
                            DDragon
                          </button>
                        </div>
                      </td>
                      <td className="config-cell">
                        {sources[entity] === 'cdragon' ? (
                          <select
                            className="config-select"
                            value={cdragonSource}
                            onChange={e => setCdragonSource(e.target.value as CDragonEnv)}
                            disabled={unifiedRunning}
                          >
                            <option value="latest">🟢 Latest (Live)</option>
                            <option value="pbe">🟡 PBE (Preview)</option>
                          </select>
                        ) : (
                          <input
                            className="config-input config-ver"
                            value={ddVersion}
                            onChange={e => setDdVersion(e.target.value)}
                            placeholder="16.7.1"
                            disabled={unifiedRunning}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Source summary */}
            <div className="source-summary">
              {usesSource('cdragon') && (
                <span className="summary-tag cdragon">🐉 CDragon: {cdragonSource.toUpperCase()}</span>
              )}
              {usesSource('ddragon') && (
                <span className="summary-tag ddragon">📦 DDragon: v{ddVersion}</span>
              )}
            </div>

            {/* Sync Button */}
            <div className="ac-actions">
              <button
                id="unified-sync-btn"
                className="ac-btn sync-main-btn"
                onClick={handleUnifiedSync}
                disabled={unifiedRunning || !setPrefix}
              >
                {unifiedRunning ? (
                  <>
                    <span className="ac-spinner" />
                    Syncing...
                  </>
                ) : '🚀 Sync Now'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Pipeline Card ─────────────────────────────────────── */}
        <ActionCard
          id="pipeline-card"
          title="Ingest Match Data"
          description={`Fetch Challenger/GM/Master ladders from ${pipelineRegions.join(', ')} → collect match IDs → ingest full match details → aggregate.`}
          badge={pipelineRunning ? 'Running' : pipelineStatus === 'completed' ? 'Last: Success' : pipelineStatus === 'error' ? 'Last: Failed' : 'RIOT API'}
          badgeColor={pipelineRunning ? '#fbbf24' : pipelineStatus === 'completed' ? '#4ade80' : pipelineStatus === 'error' ? '#f87171' : '#60a5fa'}
          actionLabel="Run Pipeline"
          actionLoading={pipelineRunning}
          actionDisabled={pipelineRegions.length === 0}
          onAction={handlePipeline}
          secondaryActionLabel="Aggregate Only"
          secondaryActionLoading={aggRunning}
          onSecondaryAction={handleAggregate}
        >
          <div className="card-inline-config">
            <div className="config-field" style={{ flex: '100%' }}>
              <label className="config-label">Regions</label>
              <div className="region-toggles">
                {['na1', 'euw1', 'vn2'].map(r => (
                  <button
                    key={r}
                    id={`region-${r}`}
                    className={`region-btn ${pipelineRegions.includes(r) ? 'on' : ''}`}
                    onClick={() => toggleRegion(r)}
                    disabled={pipelineRunning}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="config-field">
              <label htmlFor="pipeline-set" className="config-label">TFT Set #</label>
              <input
                id="pipeline-set"
                className="config-input"
                value={pipelineSetNumber}
                onChange={e => setPipelineSetNumber(e.target.value)}
                placeholder="16"
                disabled={pipelineRunning}
              />
            </div>
            <div className="config-field">
              <label htmlFor="pipeline-max" className="config-label">Max matches/player</label>
              <input
                id="pipeline-max"
                className="config-input"
                value={pipelineMaxMatches}
                onChange={e => setPipelineMaxMatches(e.target.value)}
                placeholder="20"
                disabled={pipelineRunning}
              />
            </div>
            <div className="config-field">
              <label htmlFor="pipeline-max-players" className="config-label">Max players limit</label>
              <input
                id="pipeline-max-players"
                className="config-input"
                value={pipelineMaxPlayers}
                onChange={e => setPipelineMaxPlayers(e.target.value)}
                placeholder="50"
                disabled={pipelineRunning}
              />
            </div>
          </div>
        </ActionCard>

        {/* ── Patch Notes Crawler Card ──────────────────────────── */}
        <ActionCard
          id="patch-crawl-card"
          title="Patch Notes AI Crawler"
          description="Read official patch notes and extract stat changes into the Tuning UI. Best used once the official article is published."
          badge={crawlRunning ? 'Running' : crawlStatus === 'completed' ? 'Last: Success' : crawlStatus === 'error' ? 'Last: Failed' : undefined}
          badgeColor={crawlRunning ? '#fbbf24' : crawlStatus === 'completed' ? '#4ade80' : '#f87171'}
          actionLabel="Start Crawling"
          actionLoading={crawlRunning}
          onAction={handleCrawl}
        >
          <div className="card-inline-config full-width" style={{ marginTop: '16px' }}>
            <div className="config-field" style={{ width: '100%' }}>
              <label htmlFor="crawl-url-input" className="config-label">Official URL (Auto-detect if empty)</label>
              <input
                id="crawl-url-input"
                className="config-input"
                value={crawlUrl}
                onChange={e => setCrawlUrl(e.target.value.trim())}
                placeholder="https://..."
                disabled={crawlRunning}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </ActionCard>
      </div>

      {/* ── SSE Consoles ──────────────────────────────────────────── */}
      {unifiedJobId && (
        <div className="sync-console-wrap">
          <SyncConsole
            jobId={unifiedJobId}
            setPrefix={setPrefix}
            ddVersion="unified"
            streamUrl={`/api/admin/sync/stream?job_id=${unifiedJobId}`}
            onDone={handleUnifiedDone}
          />
        </div>
      )}

      {pipelineJobId && (
        <div className="sync-console-wrap">
          <SyncConsole
            jobId={pipelineJobId}
            setPrefix={`TFT${pipelineSetNumber}`}
            ddVersion="live"
            streamUrl={`/api/admin/pipeline/stream?job_id=${pipelineJobId}&regions=${pipelineRegions.join(',')}&tft_set_number=${pipelineSetNumber}&max_matches=${pipelineMaxMatches}`}
            onDone={handlePipelineDone}
          />
        </div>
      )}

      {crawlJobId && (
        <div className="sync-console-wrap">
          <SyncConsole
            jobId={crawlJobId}
            setPrefix="patch-notes"
            ddVersion="live"
            streamUrl={`/api/admin/patch-notes/stream?job_id=${crawlJobId}`}
            onDone={handleCrawlDone}
          />
        </div>
      )}

      {/* ── Done Banners ──────────────────────────────────────────── */}
      {!unifiedRunning && unifiedStatus && (
        <div className={`sync-banner ${unifiedStatus}`}>
          {unifiedStatus === 'completed'
            ? '✅ Sync completed! Data has been written to the database.'
            : '❌ Sync failed. Check the log above for details.'}
        </div>
      )}

      {!pipelineRunning && pipelineStatus && (
        <div className={`sync-banner ${pipelineStatus}`}>
          {pipelineStatus === 'completed'
            ? '✅ Match ingestion complete! Aggregated stats are now available at /api/meta/*.'
            : '❌ Pipeline failed. Check the log above. Verify RIOT_API_KEY is set.'}
        </div>
      )}

      {!crawlRunning && crawlStatus && (
        <div className={`sync-banner ${crawlStatus}`}>
          {crawlStatus === 'completed'
            ? '✅ Patch crawl complete! Review the changes in the Tuning UI.'
            : '❌ Patch crawl failed. Check the log above.'}
        </div>
      )}

      {/* ── Recent Jobs Table ─────────────────────────────────────── */}
      <div className="sync-history">
        <h3 className="history-heading">Recent Sync Jobs</h3>
        {jobs.length === 0 ? (
          <p className="history-empty">No sync jobs yet.</p>
        ) : (
          <div className="history-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Set</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => {
                  const isPipeline = job.job_type === 'pipeline'
                  const isCDragon = job.job_type === 'cdragon'
                  const isUnified = job.job_type === 'unified'
                  const duration = job.finished_at && job.started_at
                    ? (() => {
                        const ms = new Date(job.finished_at!).getTime() - new Date(job.started_at).getTime()
                        const sec = Math.floor(ms / 1000)
                        if (sec < 60) return `${sec}s`
                        const min = Math.floor(sec / 60)
                        const remSec = sec % 60
                        return `${min}m ${remSec}s`
                      })()
                    : job.status === 'running' ? '⏳' : '—'

                  const typeLabel = isPipeline ? '🔄 Pipeline' : isUnified ? '🔀 Unified' : isCDragon ? '🐉 CDragon' : '📦 DDragon'
                  const typeClass = isPipeline ? 'pipeline' : isUnified ? 'unified' : isCDragon ? 'cdragon' : 'ddragon'

                  return (
                    <tr key={job.id} id={`job-${job.id}`} className={`row-${typeClass}`}>
                      <td>
                        <span className={`job-type-badge ${typeClass}`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td className="mono">{job.set_prefix || '—'}</td>
                      <td className="details-cell">
                        {isPipeline ? (
                          <span className="detail-tag">Match Ingestion</span>
                        ) : isUnified ? (
                          <span className="detail-tag">
                            {job.ddragon_version?.replace('unified-', '').split('/').map((s, i) => {
                              const labels = ['C', 'T', 'A', 'I']
                              return <span key={i} className={`src-indicator ${s}`} title={`${['Champions','Traits','Augments','Items'][i]}: ${s === 'cd' ? 'CDragon' : 'DDragon'}`}>{labels[i]}:{s.toUpperCase()}</span>
                            })}
                            {job.champion_count != null && <span className="detail-count"> · {job.champion_count} champs</span>}
                            {job.augment_count != null && <span className="detail-count"> · {job.augment_count} augs</span>}
                            {job.item_count != null && <span className="detail-count"> · {job.item_count} items</span>}
                          </span>
                        ) : isCDragon ? (
                          <span className="detail-tag">
                            Source: {job.ddragon_version?.replace('cdragon-', '').toUpperCase()}
                          </span>
                        ) : (
                          <span className="detail-tag">
                            v{job.ddragon_version}
                            {job.champion_count != null && <span className="detail-count"> · {job.champion_count} champs</span>}
                            {job.augment_count != null && <span className="detail-count"> · {job.augment_count} augments</span>}
                            {job.item_count != null && <span className="detail-count"> · {job.item_count} items</span>}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="status-cell">
                          <span className={`job-status ${job.status}`}>
                            {job.status === 'completed' ? '✅ Done' : job.status === 'error' ? '❌ Error' : '⏳ Running'}
                          </span>
                          <button className="view-log-btn" onClick={() => fetchAndShowLog(job.id)}>Log</button>
                        </div>
                      </td>
                      <td className="mono dimmed">{duration}</td>
                      <td className="mono dimmed">
                        {new Date(job.started_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Log Modal ─────────────────────────────────────────── */}
      {viewingLog && (
        <div className="log-modal-overlay" onClick={() => setViewingLog(null)}>
          <div className="log-modal" onClick={e => e.stopPropagation()}>
            <div className="log-modal-header">
              <span>Job Log Output </span>
              <button className="close-btn" onClick={() => setViewingLog(null)}>✕</button>
            </div>
            <div className="log-modal-body">
              {loadingLog ? (
                <span className="console-waiting">Loading logs...</span>
              ) : (
                <pre className="log-content">{viewingLog.content}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .sync-page { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #222; max-width: 1100px; margin: 0 auto; padding: 10px 0; }

        .sync-header { margin-bottom: 2.5rem; display: flex; align-items: flex-end; justify-content: space-between; }
        .sync-heading { font-family: 'Courier New', Courier, serif; font-size: 32px; font-weight: 800; margin: 0; color: #222; }
        .sync-sub { font-size: 13px; color: #9A9A9A; margin: 0; }

        .card-inline-config {
          display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 5px;
          background: #FAFAFA; padding: 15px; border-radius: 12px; width: 100%;
        }

        .config-field { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 110px; }
        .config-label { font-size: 10px; font-weight: bold; color: #9A9A9A; text-transform: uppercase; }
        .config-input {
          background: #FFF; border: 1px solid #EEE; border-radius: 8px; padding: 10px 12px;
          color: #222; font-size: 13px; font-family: inherit; font-weight: 500; outline: none; transition: 0.2s;
        }
        .config-input:focus { border-color: #4A90E2; }
        .config-input:disabled { opacity: 0.5; background: #F8F8F8; }

        .sync-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 30px; margin-bottom: 2rem; }

        /* ═══ Set Manager Card ═══ */
        .set-manager-card {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.02);
          border: 1px solid #E8E5DF;
          margin-bottom: 2rem;
          transition: 0.2s;
        }
        .set-manager-card:hover { border-color: #D8D4CE; }

        .sm-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 8px;
        }
        .sm-header-left { display: flex; align-items: center; gap: 14px; }
        .sm-title {
          font-family: 'Courier New', Courier, serif;
          font-size: 22px; font-weight: 800; color: #222; margin: 0;
        }
        .sm-active-badge {
          font-size: 11px; font-weight: bold; padding: 5px 12px; border-radius: 20px;
          background: linear-gradient(135deg, #FFF7EB, #FEF3C7); color: #D97706;
          border: 1px solid #FDE68A;
        }
        .sm-desc { font-size: 13px; color: #888; margin: 0 0 20px; line-height: 1.5; }

        .sm-add-btn {
          padding: 9px 18px; border-radius: 10px; font-size: 12px; font-weight: bold;
          border: 1.5px dashed #C4B5FD; background: #FAFAFE; color: #7C3AED;
          cursor: pointer; transition: all 0.2s;
        }
        .sm-add-btn:hover { background: #EDE9FE; border-color: #7C3AED; transform: translateY(-1px); }

        /* Add Set Form */
        .sm-add-form {
          background: linear-gradient(135deg, #F8F7FF, #FFF7F7);
          border: 1px solid #E8E5EF;
          border-radius: 14px; padding: 20px; margin-bottom: 20px;
          animation: slideDown 0.2s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .sm-form-row { display: flex; gap: 14px; align-items: flex-start; flex-wrap: wrap; }
        .sm-form-row .config-field { min-width: 140px; }

        .env-toggle { display: flex; gap: 4px; }
        .env-btn {
          padding: 8px 14px; border-radius: 8px; font-size: 11px; font-weight: bold;
          border: 1px solid #E8E8E8; background: #FFF; color: #999; cursor: pointer;
          transition: all 0.15s ease;
        }
        .env-btn:hover:not(:disabled) { border-color: #CCC; }
        .env-btn.active.pbe { background: #FFF7EB; color: #D97706; border-color: #FDE68A; }
        .env-btn.active.live { background: #ECFDF5; color: #059669; border-color: #A7F3D0; }

        .sm-submit-btn {
          padding: 10px 22px; border-radius: 10px; font-size: 12px; font-weight: bold;
          border: none; background: #7C3AED; color: #FFF; cursor: pointer;
          transition: all 0.2s; white-space: nowrap;
        }
        .sm-submit-btn:hover:not(:disabled) { background: #6D28D9; transform: translateY(-1px); }
        .sm-submit-btn:disabled { background: #D4D4D4; cursor: not-allowed; }

        .sm-loading { padding: 30px; text-align: center; color: #9A9A9A; font-size: 13px; }
        .sm-empty { padding: 30px; text-align: center; color: #B0B0B0; font-size: 13px; border: 1.5px dashed #E8E8E8; border-radius: 12px; }

        /* Sets Grid */
        .sm-sets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }

        .sm-set-card {
          background: #FAFAFA; border-radius: 14px; padding: 18px;
          border: 1.5px solid #EEEEEE; transition: all 0.2s;
          position: relative; overflow: hidden;
        }
        .sm-set-card::before {
          content: '';
          position: absolute; top: 0; left: 0; width: 4px; height: 100%;
          background: #D4D4D4; transition: 0.2s;
        }
        .sm-set-card:hover { border-color: #DDD; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.04); }
        .sm-set-card.active::before { background: linear-gradient(180deg, #F59E0B, #D97706); }
        .sm-set-card.active { border-color: #FDE68A; background: #FFFDF7; }
        .sm-set-card.has-data::before { background: linear-gradient(180deg, #10B981, #059669); }
        .sm-set-card.has-data.active::before { background: linear-gradient(180deg, #F59E0B, #D97706); }
        .sm-set-card.no-data::before { background: linear-gradient(180deg, #94A3B8, #64748B); }

        .sm-set-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
        .sm-set-info { display: flex; flex-direction: column; gap: 2px; }
        .sm-set-prefix { font-family: 'Courier New', monospace; font-size: 18px; font-weight: 800; color: #222; }
        .sm-set-label { font-size: 12px; color: #888; }

        .sm-set-badges { display: flex; gap: 6px; flex-wrap: wrap; }
        .sm-env-tag {
          font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 6px;
        }
        .sm-env-tag.pbe { background: #FFF7EB; color: #D97706; }
        .sm-env-tag.live { background: #ECFDF5; color: #059669; }
        .sm-active-tag {
          font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 6px;
          background: linear-gradient(135deg, #FFF7EB, #FEF3C7); color: #D97706;
        }
        .sm-discovered-tag {
          font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 6px;
          background: #F0F9FF; color: #0284C7;
        }

        /* Entity Counts */
        .sm-set-counts {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
          background: #FFF; border-radius: 10px; padding: 12px;
          border: 1px solid #F0F0F0; margin-bottom: 14px;
        }
        .sm-count-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .sm-count-num { font-family: 'Courier New', monospace; font-size: 18px; font-weight: 800; color: #222; }
        .sm-count-label { font-size: 9px; color: #9A9A9A; text-transform: uppercase; font-weight: bold; }

        /* Set Actions */
        .sm-set-actions { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
        .sm-action-btn {
          padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: bold;
          border: 1px solid #E8E8E8; background: #FFF; cursor: pointer; transition: all 0.15s;
          white-space: nowrap;
        }
        .sm-action-btn:hover { transform: translateY(-1px); }
        .sm-action-btn.sync-btn { color: #2563EB; border-color: #BFDBFE; }
        .sm-action-btn.sync-btn:hover { background: #EFF6FF; }
        .sm-action-btn.activate-btn { color: #D97706; border-color: #FDE68A; }
        .sm-action-btn.activate-btn:hover { background: #FFFBEB; }
        .sm-action-btn.delete-btn { color: #9A9A9A; border-color: #E8E8E8; }
        .sm-action-btn.delete-btn:hover { color: #EF4444; background: #FEF2F2; border-color: #FECACA; }
        .sm-action-btn.purge-btn { color: #DC2626; border-color: #FCA5A5; }
        .sm-action-btn.purge-btn:hover { background: #FEF2F2; }

        .sm-purge-confirm { display: flex; align-items: center; gap: 6px; }
        .purge-warning { font-size: 11px; font-weight: bold; color: #DC2626; }
        .sm-action-btn.purge-yes { background: #DC2626; color: #FFF; border-color: #DC2626; }
        .sm-action-btn.purge-yes:hover { background: #B91C1C; }
        .sm-action-btn.purge-no { color: #666; }

        /* ═══ Unified Card ═══ */
        .unified-card {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 25px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.02);
          border: 1px solid transparent;
          transition: 0.2s;
          grid-column: 1 / -1;
        }
        .unified-card:hover { border-color: #EEE8E0; }
        .unified-card .ac-body { width: 100%; }
        .unified-card .ac-header { display: flex; align-items: center; gap: 15px; margin-bottom: 8px; }
        .unified-card .ac-title { font-family: 'Courier New', Courier, serif; font-size: 20px; font-weight: 800; color: #222; margin: 0; }
        .unified-card .ac-desc { font-size: 13px; color: #666; margin: 0 0 20px; line-height: 1.5; }
        .unified-card .ac-badge {
          font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 6px;
          text-transform: uppercase; background: #E8F7F3; color: #10b981;
        }
        .unified-card .ac-badge.badge-running { background: #FFF7EB; color: #F5A623; }

        .unified-config-row { display: flex; gap: 15px; margin-bottom: 20px; }

        .set-prefix-combo { position: relative; }
        .set-prefix-combo .config-input { width: 140px; font-weight: bold; font-size: 14px; }

        /* ═══ Source Config Table ═══ */
        .source-table-wrap {
          background: #FAFAFA; border-radius: 12px; padding: 4px; margin-bottom: 16px;
          overflow: hidden;
        }
        .source-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .source-table th {
          color: #9A9A9A; font-weight: bold; font-size: 10px; text-transform: uppercase;
          padding: 12px 16px; text-align: left; border-bottom: 1px solid #EEE;
        }
        .source-table td { padding: 10px 16px; border-bottom: 1px solid #F0F0F0; }
        .source-table tr:last-child td { border-bottom: none; }
        .source-table tr:hover td { background: #F5F5F5; }

        .entity-name { font-weight: 600; font-size: 13px; white-space: nowrap; }

        .source-toggle { display: flex; gap: 4px; }
        .src-btn {
          padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: bold;
          border: 1px solid #E8E8E8; background: #FFF; color: #999; cursor: pointer;
          transition: all 0.15s ease;
        }
        .src-btn:hover:not(:disabled) { border-color: #CCC; color: #666; }
        .src-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .src-btn.active.cdragon { background: #FCE7F3; color: #DB2777; border-color: #F9A8D4; }
        .src-btn.active.ddragon { background: #EDE9FE; color: #7C3AED; border-color: #C4B5FD; }

        .config-cell { min-width: 160px; }
        .config-select {
          background: #FFF; border: 1px solid #EEE; border-radius: 8px; padding: 8px 12px;
          color: #222; font-size: 12px; font-weight: 500; outline: none; cursor: pointer;
          width: 100%; transition: 0.2s;
        }
        .config-select:focus { border-color: #4A90E2; }
        .config-select:disabled { opacity: 0.5; }
        .config-ver { width: 100px; padding: 8px 12px; font-size: 12px; }

        .source-summary {
          display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;
        }
        .summary-tag {
          font-size: 11px; font-weight: bold; padding: 6px 12px; border-radius: 20px;
        }
        .summary-tag.cdragon { background: #FCE7F3; color: #DB2777; }
        .summary-tag.ddragon { background: #EDE9FE; color: #7C3AED; }

        .ac-actions { display: flex; gap: 15px; align-items: center; }
        .ac-btn {
          padding: 10px 20px; background: #4A90E2; border: none; border-radius: 8px;
          color: #fff; font-size: 12px; font-weight: bold; cursor: pointer; transition: 0.2s;
          display: inline-flex; align-items: center; gap: 8px; min-width: 120px; justify-content: center;
        }
        .ac-btn:hover:not(:disabled) { background: #357ABD; transform: translateY(-1px); }
        .ac-btn:disabled { background: #E8E8E8; color: #A9A9A9; cursor: not-allowed; transform: none; }

        .sync-main-btn { padding: 12px 32px; font-size: 14px; min-width: 160px; }

        .ac-spinner {
          width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff; border-radius: 50%; animation: ac-spin 0.6s linear infinite; flex-shrink: 0;
        }
        @keyframes ac-spin { to { transform: rotate(360deg); } }

        /* ═══ Job History ═══ */
        .sync-banner { padding: 15px 20px; border-radius: 12px; font-size: 13px; font-weight: bold; margin-bottom: 2rem; }
        .sync-banner.completed { background: #E8F7F3; color: #50E3C2; }
        .sync-banner.error { background: #FDECEA; color: #EB5E28; }

        .sync-history {
          margin-top: 3rem; background: #FFF; border-radius: 16px; padding: 30px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.02);
        }
        .history-heading { font-family: 'Courier New', Courier, serif; font-size: 24px; font-weight: 800; color: #222; margin: 0 0 20px; }
        .history-empty { font-size: 13px; color: #9A9A9A; }

        .history-table-wrap { overflow-x: auto; }
        .history-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .history-table th { color: #9A9A9A; font-weight: bold; font-size: 11px; text-transform: uppercase; padding: 15px; text-align: left; border-bottom: 2px solid #F8F4EE; }
        .history-table td { padding: 15px; color: #222; border-bottom: 1px solid #F8F4EE; font-weight: 500; }
        .history-table tr:last-child td { border-bottom: none; }
        .history-table tr:hover td { background: #FDFBfa; }

        .mono { font-family: 'Courier New', Courier, monospace; font-weight: bold; }
        .dimmed { color: #9A9A9A !important; font-weight: normal; }

        .job-status { font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 6px; }
        .job-status.completed { background: #E8F7F3; color: #50E3C2; }
        .job-status.error { background: #FDECEA; color: #EB5E28; }
        .job-status.running { background: #FFF7EB; color: #F5A623; }

        .job-type-badge {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 20px;
          white-space: nowrap;
        }
        .job-type-badge.ddragon { background: #EDE9FE; color: #7C3AED; }
        .job-type-badge.pipeline { background: #DBEAFE; color: #2563EB; }
        .job-type-badge.cdragon { background: #FCE7F3; color: #DB2777; }
        .job-type-badge.unified { background: #F0FDF4; color: #16a34a; }

        .src-indicator {
          display: inline-block; font-size: 10px; font-weight: bold; padding: 2px 6px;
          border-radius: 4px; margin-right: 4px;
        }
        .src-indicator.cd { background: #FCE7F3; color: #DB2777; }
        .src-indicator.dd { background: #EDE9FE; color: #7C3AED; }

        .details-cell { min-width: 140px; }
        .detail-tag { font-size: 12px; font-weight: 500; color: #555; }
        .detail-count { font-size: 11px; color: #9A9A9A; }

        .region-toggles { display: flex; gap: 10px; flex-wrap: wrap; }
        .region-btn {
          padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold;
          border: none; background: #F8F4EE; color: #9A9A9A; cursor: pointer; transition: 0.2s;
        }
        .region-btn:hover { background: #EEE8E0; }
        .region-btn.on { color: #FFF; background: #4A90E2; }
        .region-btn:disabled { opacity: 0.5; }

        .status-cell { display: flex; align-items: center; gap: 10px; }
        .view-log-btn {
          background: #F8F4EE; color: #222; border: none;
          border-radius: 8px; padding: 4px 10px; font-size: 11px; font-weight: bold; cursor: pointer; transition: 0.2s;
        }
        .view-log-btn:hover { background: #4A90E2; color: #FFF; }

        .log-modal-overlay {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.2); backdrop-filter: blur(5px);
          display: flex; align-items: center; justify-content: center; z-index: 1000;
        }
        .log-modal {
          background: #FFF; border-radius: 16px; width: 90%; max-width: 800px; max-height: 80vh;
          display: flex; flex-direction: column; box-shadow: 0 20px 50px rgba(0,0,0,0.1); overflow: hidden;
        }
        .log-modal-header { padding: 20px 25px; display: flex; justify-content: space-between; align-items: center; font-weight: bold; color: #222; font-size: 16px; border-bottom: 1px solid #F8F4EE; }
        .close-btn { background: none; border: none; color: #9A9A9A; cursor: pointer; font-size: 20px; }
        .close-btn:hover { color: #EB5E28; }
        .log-modal-body { padding: 25px; overflow-y: auto; font-family: monospace; font-size: 13px; color: #666; background: #FAFAFA; }
        .log-content { margin: 0; white-space: pre-wrap; word-wrap: break-word; line-height: 1.6; }
        .console-waiting { color: #9A9A9A; animation: pulse 1.5s infinite; }
      `}</style>
    </div>
  )
}

