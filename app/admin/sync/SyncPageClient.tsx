'use client'

import { useState, useCallback, useEffect } from 'react'
import { ActionCard } from '@/components/admin/ActionCard'
import { SyncConsole } from '@/components/admin/SyncConsole'

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

interface Props {
  recentJobs: SyncJob[]
}

const SEMVER_RE = /^\d+\.\d+(\.\d+)?$/

export function SyncPageClient({ recentJobs: initialJobs }: Props) {
  const [setPrefix, setSetPrefix] = useState('TFT16')
  const [ddVersion, setDdVersion] = useState('')
  const [versionError, setVersionError] = useState('')

  const [running, setRunning] = useState(false)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [lastStatus, setLastStatus] = useState<'completed' | 'error' | null>(null)
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

  // CDragon state
  const [cdragonRunning, setCdragonRunning] = useState(false)
  const [cdragonJobId, setCdragonJobId] = useState<string | null>(null)
  const [cdragonStatus, setCdragonStatus] = useState<'completed' | 'error' | null>(null)
  const [cdragonSource, setCdragonSource] = useState<'latest' | 'pbe'>('latest')

  // Patch Crawler State
  const [crawlRunning, setCrawlRunning] = useState(false)
  const [crawlJobId, setCrawlJobId] = useState<string | null>(null)
  const [crawlStatus, setCrawlStatus] = useState<'completed' | 'error' | null>(null)
  const [crawlUrl, setCrawlUrl] = useState('')

  // Next Set Prep
  const [nextSetPrefix, setNextSetPrefix] = useState('TFT17')

  // Log Viewer
  const [viewingLog, setViewingLog] = useState<{ id: string, content: string | null } | null>(null)
  const [loadingLog, setLoadingLog] = useState(false)

  // Auto-detect the latest patch from Match History (our database) instead of DDragon
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    fetch(`${apiUrl}/api/meta/stats/patches`)
      .then(r => r.json())
      .then((patches: string[]) => {
        if (patches && patches.length > 0) {
          const latestPatch = patches[0]; // e.g., '16.8' or '16.7'
          // Automatically append .1 for DDragon version since DDragon versions always have 3 segments
          setDdVersion(`${latestPatch}.1`);
          
          // Extract the major version for set prefix
          const major = parseInt(latestPatch.split('.')[0]);
          if (major) {
            setPipelineSetNumber(major.toString());
            setSetPrefix(`TFT${major}`);
            setNextSetPrefix(`TFT${major + 1}`);
          }
        }
      })
      .catch(err => console.error('Failed to auto-detect patch from match history:', err));
  }, []);

  function validateVersion(v: string) {
    if (!SEMVER_RE.test(v)) {
      setVersionError('Must be a valid version like 17.1.1')
      return false
    }
    setVersionError('')
    return true
  }

  async function handleSync() {
    if (!validateVersion(ddVersion)) return
    setRunning(true)
    setLastStatus(null)
    setCurrentJobId(null)

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

    try {
      const res = await fetch(`${apiUrl}/api/admin/sync/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ set_prefix: setPrefix, ddragon_version: ddVersion }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start sync')
      setCurrentJobId(data.job_id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      alert(`Could not start sync: ${msg}`)
      setRunning(false)
    }
  }

  const handleDone = useCallback((status: 'completed' | 'error') => {
    setRunning(false)
    setLastStatus(status)
    setJobs(prev => {
      const existing = prev.find(j => j.id === currentJobId)
      const newJob: SyncJob = {
        id: currentJobId!,
        job_type: 'ddragon',
        set_prefix: setPrefix,
        ddragon_version: ddVersion,
        status,
        champion_count: null, trait_count: null, augment_count: null, item_count: null,
        started_at: existing ? existing.started_at : new Date().toISOString(),
        finished_at: new Date().toISOString(),
      }
      return existing ? prev.map(j => j.id === currentJobId ? newJob : j) : [newJob, ...prev].slice(0, 10)
    })
  }, [currentJobId, setPrefix, ddVersion])

  async function handlePipeline() {
    setPipelineRunning(true)
    setPipelineStatus(null)
    setPipelineJobId(null)
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    
    try {
      const res = await fetch(`${apiUrl}/api/admin/pipeline/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regions: pipelineRegions,
          queue_ids: [1100], // Only Ranked
          max_matches: parseInt(pipelineMaxMatches, 10),
          max_players: parseInt(pipelineMaxPlayers, 10),
          tft_set_number: parseInt(pipelineSetNumber, 10),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start pipeline')
      setPipelineJobId(data.job_id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      alert(`Could not start pipeline: ${msg}`)
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
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
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

  async function handleCDragonSync(overridePrefix?: string, overrideSource?: 'latest' | 'pbe') {
    const targetPrefix = overridePrefix || setPrefix
    const targetSource = overrideSource || cdragonSource
    
    setCdragonRunning(true)
    setCdragonStatus(null)
    setCdragonJobId(null)

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    try {
      const res = await fetch(`${apiUrl}/api/admin/cdragon/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ set_prefix: targetPrefix, cdragon_source: targetSource }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start CDragon sync')
      setCdragonJobId(data.job_id)
    } catch (err: unknown) {
      alert(`Could not start CDragon sync: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setCdragonRunning(false)
    }
  }

  const handleCDragonDone = useCallback((status: 'completed' | 'error') => {
    setCdragonRunning(false)
    setCdragonStatus(status)
    setJobs(prev => {
      const existing = prev.find(j => j.id === cdragonJobId)
      const newJob: SyncJob = {
        id: cdragonJobId!,
        job_type: 'cdragon',
        set_prefix: setPrefix,
        ddragon_version: `cdragon-${cdragonSource}`,
        status,
        champion_count: null, trait_count: null, augment_count: null, item_count: null,
        started_at: existing ? existing.started_at : new Date().toISOString(),
        finished_at: new Date().toISOString(),
      }
      return existing ? prev.map(j => j.id === cdragonJobId ? newJob : j) : [newJob, ...prev].slice(0, 10)
    })
  }, [cdragonJobId, setPrefix, cdragonSource])

  async function handleCrawl() {
    setCrawlRunning(true)
    setCrawlJobId(null)
    setCrawlStatus(null)

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    try {
      const res = await fetch(`${apiUrl}/api/admin/patch-notes/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crawlUrl ? { url: crawlUrl } : {}),
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
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    try {
      const res = await fetch(`${apiUrl}/api/admin/sync/logs/${jobId}`)
      const data = await res.json()
      setViewingLog({ id: jobId, content: data?.log_output || 'No log output found for this job.' })
    } catch {
      setViewingLog({ id: jobId, content: 'Failed to fetch log output from Backend.' })
    }
    setLoadingLog(false)
  }

  return (
    <div className="sync-page">
      <div className="sync-header">
        <h2 className="sync-heading">Data Sync</h2>
        <p className="sync-sub">Sync static TFT entities (champs, traits, items) from the best source.</p>
      </div>

      <div className="sync-actions">
        {/* Live Set Sync Card (CDragon + DDragon Fallback) */}
        <ActionCard
          id="live-set-sync-card"
          title={`Live Set Sync (${setPrefix})`}
          description="Sync data for the current live set. CommunityDragon is usually faster, while DDragon is the official Riot source."
          badge={cdragonRunning && cdragonSource === 'latest' ? 'Running CDragon' : running ? 'Running DDragon' : 'STABLE'}
          badgeColor={cdragonRunning || running ? '#fbbf24' : '#10b981'}
          actionLabel="Fast Sync (CDragon)"
          actionLoading={cdragonRunning && cdragonSource === 'latest'}
          onAction={() => { setCdragonSource('latest'); handleCDragonSync(setPrefix, 'latest'); }}
          secondaryActionLabel="Official (DDragon)"
          secondaryActionLoading={running}
          onSecondaryAction={handleSync}
        >
          <div className="card-inline-config">
            <div className="config-field">
              <label htmlFor="set-prefix-input" className="config-label">Set Prefix</label>
              <input
                id="set-prefix-input"
                className="config-input"
                value={setPrefix}
                onChange={e => setSetPrefix(e.target.value.toUpperCase().trim())}
                placeholder="TFT16"
                disabled={running || cdragonRunning}
              />
            </div>
            <div className="config-field">
              <label htmlFor="dd-version-input" className="config-label">DDragon Ver.</label>
              <input
                id="dd-version-input"
                className="config-input"
                value={ddVersion}
                onChange={e => setDdVersion(e.target.value)}
                placeholder="16.7.1"
                disabled={running || cdragonRunning}
              />
            </div>
          </div>
        </ActionCard>

        {/* PBE Next Set Sync Card */}
        <ActionCard
          id="pbe-next-set-card"
          title="Next Set PBE Sync (Early Access)"
          description={`Proactively sync data for the UPCOMING set (${nextSetPrefix}) from CDragon PBE server.`}
          badge={cdragonRunning && cdragonSource === 'pbe' ? 'Running' : 'PRE-RELEASE'}
          badgeColor={cdragonRunning && cdragonSource === 'pbe' ? '#fbbf24' : '#f59e0b'}
          actionLabel={`Sync ${nextSetPrefix} (PBE)`}
          actionLoading={cdragonRunning && cdragonSource === 'pbe'}
          onAction={() => { 
            setCdragonSource('pbe');
            setSetPrefix(nextSetPrefix);
            handleCDragonSync(nextSetPrefix, 'pbe'); 
          }}
        >
          <div className="card-inline-config">
            <div className="config-field">
              <label htmlFor="next-set-input" className="config-label">Target Next Set</label>
              <input
                id="next-set-input"
                className="config-input"
                value={nextSetPrefix}
                onChange={e => setNextSetPrefix(e.target.value.toUpperCase().trim())}
                placeholder="TFT17"
                disabled={cdragonRunning}
              />
            </div>
          </div>
        </ActionCard>

        {/* Riot Match Pipeline Card */}
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

        {/* Patch Notes Crawler Card */}
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

      {/* SSE Consoles */}
      {currentJobId && (
        <div className="sync-console-wrap">
          <SyncConsole
            jobId={currentJobId}
            setPrefix={setPrefix}
            ddVersion={ddVersion}
            onDone={handleDone}
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

      {cdragonJobId && (
        <div className="sync-console-wrap">
          <SyncConsole
            jobId={cdragonJobId}
            setPrefix={setPrefix}
            ddVersion={`cdragon-${cdragonSource}`}
            streamUrl={`/api/admin/sync/stream?job_id=${cdragonJobId}`}
            onDone={handleCDragonDone}
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

      {/* Done Banners */}
      {!running && lastStatus && (
        <div className={`sync-banner ${lastStatus}`}>
          {lastStatus === 'completed'
            ? '✅ Sync completed successfully! Data has been written to the Postgres Database.'
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

      {!cdragonRunning && cdragonStatus && (
        <div className={`sync-banner ${cdragonStatus}`}>
          {cdragonStatus === 'completed'
            ? '✅ CDragon Sync complete! New data is ready in the database.'
            : '❌ CDragon Sync failed. Check the log above.'}
        </div>
      )}

      {!crawlRunning && crawlStatus && (
        <div className={`sync-banner ${crawlStatus}`}>
          {crawlStatus === 'completed'
            ? '✅ Patch crawl complete! Review the changes in the Tuning UI.'
            : '❌ Patch crawl failed. Check the log above.'}
        </div>
      )}

      {/* Recent jobs table */}
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
                  return (
                    <tr key={job.id} id={`job-${job.id}`} className={isPipeline ? 'row-pipeline' : isCDragon ? 'row-cdragon' : 'row-ddragon'}>
                      <td>
                        <span className={`job-type-badge ${isPipeline ? 'pipeline' : isCDragon ? 'cdragon' : 'ddragon'}`}>
                          {isPipeline ? '🔄 Pipeline' : isCDragon ? '🐉 CDragon' : '📦 DDragon'}
                        </span>
                      </td>
                      <td className="mono">{job.set_prefix || '—'}</td>
                      <td className="details-cell">
                        {isPipeline ? (
                          <span className="detail-tag">Match Ingestion</span>
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

      {/* Log Modal */}
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
        .config-input:focus { border-color: #EB5E28; }
        .config-input.error { border-color: #EB5E28; }
        .config-input:disabled { opacity: 0.5; background: #F8F8F8; }
        .config-error { font-size: 10px; color: #EB5E28; }

        .sync-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 30px; margin-bottom: 2rem; }

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

        .on.cdragon { background: #DB2777; color: #FFF; }
        .on.pbe-btn { background: #F59E0B; color: #FFF; }

        .details-cell { min-width: 140px; }
        .detail-tag { font-size: 12px; font-weight: 500; color: #555; }
        .detail-count { font-size: 11px; color: #9A9A9A; }

        .pipeline-section { margin-top: 40px; }

        .section-divider {
          display: flex; align-items: center; gap: 15px; margin-bottom: 25px;
          color: #222; font-size: 18px; font-family: 'Courier New', Courier, serif; font-weight: 800;
        }

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
