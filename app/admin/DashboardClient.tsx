'use client'

import { useAdminSet } from '@/components/admin/AdminSetContext'
import { DashboardCharts } from './DashboardCharts'
import { useState, useEffect } from 'react'

interface SyncJob {
  id: string
  job_type: string
  set_prefix: string
  status: string
  started_at: string
  finished_at: string | null
}

export function DashboardClient() {
  const {
    currentSet, availableSets, setCurrentSet,
    liveSet, setLiveSet, publishLiveSet, isPublishing,
    setCounts,
  } = useAdminSet()

  const [recentJobs, setRecentJobs] = useState<SyncJob[]>([])
  const [syncingCDragon, setSyncingCDragon] = useState(false)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  useEffect(() => {
    fetch(`${apiUrl}/api/admin/sync/jobs?limit=5`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .then(data => setRecentJobs(Array.isArray(data) ? data.slice(0, 5) : []))
      .catch(() => {})
  }, [apiUrl])

  async function handleQuickSync(source: 'latest' | 'pbe') {
    setSyncingCDragon(true)
    try {
      const prefix = source === 'pbe'
        ? availableSets[availableSets.length - 1] || currentSet
        : currentSet
      const res = await fetch(`${apiUrl}/api/admin/cdragon/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ set_prefix: prefix, cdragon_source: source }),
      })
      if (res.ok) {
        alert(`✅ CDragon ${source.toUpperCase()} sync started for ${prefix}! Check Sync page for progress.`)
      } else {
        const err = await res.json()
        alert(`❌ Failed: ${err.error || 'Unknown error'}`)
      }
    } catch { alert('❌ Network error') }
    finally { setSyncingCDragon(false) }
  }

  return (
    <div className="dc-page">
      {/* ── Header ── */}
      <div className="dc-header">
        <div>
          <h1 className="dc-title">Command Center</h1>
          <p className="dc-sub">Manage TFT sets, sync data, and publish changes</p>
        </div>
      </div>

      {/* ── Set Status Cards ── */}
      <div className="dc-set-grid">
        {availableSets.map(prefix => {
          const counts = setCounts[prefix] || { champions: 0, traits: 0, augments: 0, items: 0 }
          const isLive = prefix === liveSet
          const isViewing = prefix === currentSet
          return (
            <div
              key={prefix}
              className={`dc-set-card ${isViewing ? 'viewing' : ''} ${isLive ? 'live' : ''}`}
              onClick={() => setCurrentSet(prefix)}
            >
              <div className="dc-set-top">
                <span className="dc-set-name">{prefix.replace('TFT', 'Set ')}</span>
                <div className="dc-set-badges">
                  {isLive && <span className="dc-badge dc-badge-live">LIVE</span>}
                  {isViewing && <span className="dc-badge dc-badge-viewing">VIEWING</span>}
                </div>
              </div>
              <div className="dc-set-counts">
                <div className="dc-count-item">
                  <span className="dc-count-val">{counts.champions}</span>
                  <span className="dc-count-label">Champions</span>
                </div>
                <div className="dc-count-item">
                  <span className="dc-count-val">{counts.traits}</span>
                  <span className="dc-count-label">Traits</span>
                </div>
                <div className="dc-count-item">
                  <span className="dc-count-val">{counts.augments}</span>
                  <span className="dc-count-label">Augments</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Middle Row: Live Set Publisher + Quick Sync ── */}
      <div className="dc-mid-grid">
        {/* Publish Live Set */}
        <div className="dc-publish-card">
          <div className="dc-card-header">
            <span className="dc-card-icon">🌐</span>
            <h3 className="dc-card-title">Publish Live Set</h3>
          </div>
          <p className="dc-card-desc">
            Change which set is visible on the <strong>public client</strong> (Tierlist, Builder, Patch Notes).
          </p>
          <div className="dc-publish-row">
            <select
              className="dc-publish-select"
              value={liveSet}
              onChange={e => setLiveSet(e.target.value)}
              disabled={isPublishing}
            >
              {availableSets.map(s => (
                <option key={s} value={s}>{s.replace('TFT', 'Set ')}</option>
              ))}
            </select>
            <button
              className="dc-btn dc-btn-publish"
              onClick={publishLiveSet}
              disabled={isPublishing}
            >
              {isPublishing ? 'Publishing...' : 'Publish'}
            </button>
          </div>
          <div className="dc-publish-current">
            Current: <strong>{liveSet.replace('TFT', 'Set ')}</strong>
          </div>
        </div>

        {/* Quick Sync Actions */}
        <div className="dc-sync-card">
          <div className="dc-card-header">
            <span className="dc-card-icon">⚡</span>
            <h3 className="dc-card-title">Quick Sync</h3>
          </div>
          <p className="dc-card-desc">
            Trigger CDragon sync without navigating to the Sync page.
          </p>
          <div className="dc-sync-actions">
            <button
              className="dc-btn dc-btn-sync"
              onClick={() => handleQuickSync('latest')}
              disabled={syncingCDragon}
            >
              🐉 Sync Live ({currentSet})
            </button>
            <button
              className="dc-btn dc-btn-pbe"
              onClick={() => handleQuickSync('pbe')}
              disabled={syncingCDragon}
            >
              🧪 Sync PBE (Next Set)
            </button>
          </div>
        </div>
      </div>

      {/* ── Activity & Recent Jobs ── */}
      <div className="dc-bottom-grid">
        <div className="dc-activity-card">
          <h3 className="dc-section-title">Activity</h3>
          <DashboardCharts />
        </div>

        <div className="dc-jobs-card">
          <h3 className="dc-section-title">Recent Jobs</h3>
          {recentJobs.length === 0 ? (
            <p className="dc-empty">No sync jobs yet. Use the Sync page to get started.</p>
          ) : (
            <div className="dc-jobs-list">
              {recentJobs.map(job => {
                const dur = job.finished_at && job.started_at
                  ? (() => {
                    const ms = new Date(job.finished_at!).getTime() - new Date(job.started_at).getTime()
                    const s = Math.floor(ms / 1000)
                    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
                  })()
                  : job.status === 'running' ? '⏳' : '—'
                return (
                  <div key={job.id} className="dc-job-row">
                    <span className={`dc-job-type ${job.job_type}`}>
                      {job.job_type === 'pipeline' ? '🔄' : job.job_type === 'cdragon' ? '🐉' : '📦'}
                    </span>
                    <div className="dc-job-info">
                      <span className="dc-job-name">{job.job_type} · {job.set_prefix}</span>
                      <span className="dc-job-time">
                        {new Date(job.started_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className={`dc-job-status ${job.status}`}>
                      {job.status === 'completed' ? '✅' : job.status === 'error' ? '❌' : '⏳'} {dur}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          <a href="/admin/sync" className="dc-view-all">View All Jobs →</a>
        </div>
      </div>

      <style>{`
        .dc-page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 10px 0;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #222;
        }

        .dc-header {
          margin-bottom: 35px;
        }
        .dc-title {
          font-family: 'Courier New', Courier, serif;
          font-size: 36px;
          font-weight: 800;
          margin: 0 0 6px;
          color: #222;
        }
        .dc-sub { font-size: 14px; color: #9A9A9A; margin: 0; }

        /* ── Set Status Cards ── */
        .dc-set-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .dc-set-card {
          background: #FFF;
          border: 2px solid #F0EDEA;
          border-radius: 16px;
          padding: 22px;
          cursor: pointer;
          transition: all 0.25s ease;
          position: relative;
        }
        .dc-set-card:hover { border-color: #DDD; box-shadow: 0 8px 25px rgba(0,0,0,0.04); transform: translateY(-2px); }
        .dc-set-card.viewing { border-color: #EB5E28; box-shadow: 0 0 0 3px rgba(235,94,40,0.1); }
        .dc-set-card.live::before {
          content: '';
          position: absolute;
          top: -1px; right: 20px;
          width: 8px; height: 8px;
          background: #10B981;
          border-radius: 50%;
          box-shadow: 0 0 6px rgba(16,185,129,0.5);
          animation: dc-pulse 2s infinite;
        }
        @keyframes dc-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }

        .dc-set-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }
        .dc-set-name {
          font-family: 'Courier New', Courier, serif;
          font-size: 22px;
          font-weight: 800;
        }
        .dc-set-badges { display: flex; gap: 6px; }
        .dc-badge {
          font-size: 9px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .dc-badge-live { background: #ECFDF5; color: #059669; }
        .dc-badge-viewing { background: #FEF2E8; color: #EB5E28; }

        .dc-set-counts {
          display: flex;
          gap: 20px;
        }
        .dc-count-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .dc-count-val {
          font-family: 'Courier New', Courier, serif;
          font-size: 24px;
          font-weight: 700;
        }
        .dc-count-label {
          font-size: 11px;
          color: #9A9A9A;
          font-weight: 500;
        }

        /* ── Middle Row ── */
        .dc-mid-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }

        .dc-publish-card, .dc-sync-card {
          background: #FFF;
          border: 1px solid #F0EDEA;
          border-radius: 16px;
          padding: 24px;
        }

        .dc-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .dc-card-icon { font-size: 20px; }
        .dc-card-title {
          font-family: 'Courier New', Courier, serif;
          font-size: 18px;
          font-weight: 700;
          margin: 0;
        }
        .dc-card-desc {
          font-size: 13px;
          color: #9A9A9A;
          margin: 0 0 18px;
          line-height: 1.5;
        }

        .dc-publish-row {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }
        .dc-publish-select {
          flex: 1;
          background: #FAFAFA;
          border: 1px solid #EEE;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 14px;
          font-weight: 600;
          color: #222;
          outline: none;
          cursor: pointer;
        }
        .dc-publish-select:focus { border-color: #EB5E28; }
        .dc-publish-current {
          font-size: 12px;
          color: #9A9A9A;
        }

        .dc-btn {
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .dc-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .dc-btn-publish {
          background: #EB5E28;
          color: #FFF;
          box-shadow: 0 4px 12px rgba(235,94,40,0.25);
        }
        .dc-btn-publish:hover:not(:disabled) { background: #d44f1e; }

        .dc-sync-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .dc-btn-sync {
          background: #F0FBF8;
          color: #059669;
          border: 1px solid #D1FAE5;
        }
        .dc-btn-sync:hover:not(:disabled) { background: #D1FAE5; }
        .dc-btn-pbe {
          background: #FFF7ED;
          color: #D97706;
          border: 1px solid #FDE68A;
        }
        .dc-btn-pbe:hover:not(:disabled) { background: #FDE68A; }

        /* ── Bottom Row ── */
        .dc-bottom-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 20px;
        }

        .dc-activity-card, .dc-jobs-card {
          background: #FFF;
          border: 1px solid #F0EDEA;
          border-radius: 16px;
          padding: 24px;
        }
        .dc-section-title {
          font-family: 'Courier New', Courier, serif;
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 20px;
        }

        .dc-jobs-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .dc-job-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #F8F4EE;
        }
        .dc-job-row:last-child { border-bottom: none; }
        .dc-job-type { font-size: 18px; flex-shrink: 0; }
        .dc-job-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .dc-job-name { font-size: 13px; font-weight: 600; color: #222; text-transform: capitalize; }
        .dc-job-time { font-size: 11px; color: #9A9A9A; }
        .dc-job-status {
          font-size: 12px;
          font-weight: 600;
          font-family: 'Courier New', Courier, monospace;
          white-space: nowrap;
        }
        .dc-job-status.completed { color: #10B981; }
        .dc-job-status.error { color: #EF4444; }
        .dc-job-status.running { color: #F59E0B; }
        .dc-empty { font-size: 13px; color: #9A9A9A; margin: 20px 0; }
        .dc-view-all {
          display: inline-block;
          margin-top: 15px;
          font-size: 13px;
          font-weight: 600;
          color: #EB5E28;
          text-decoration: none;
        }
        .dc-view-all:hover { text-decoration: underline; }

        @media (max-width: 768px) {
          .dc-mid-grid, .dc-bottom-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
