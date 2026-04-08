'use client'

import { useAdminSet } from '@/components/admin/AdminSetContext'
import { DashboardCharts } from './DashboardCharts'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SyncJob {
  id: string
  job_type: string
  set_prefix: string
  status: string
  started_at: string
  finished_at: string | null
}

interface Insight {
  id: string
  title: string
  status: string
  created_at: string
  author_id: string | null
}

export function DashboardClient() {
  const {
    currentSet, availableSets, setCurrentSet,
    liveSet, refreshSets, setLabels
  } = useAdminSet()

  const [recentJobs, setRecentJobs] = useState<SyncJob[]>([])
  const [recentInsights, setRecentInsights] = useState<Insight[]>([])
  const [recentPatches, setRecentPatches] = useState<string[]>([])
  const [isPublishingSet, setIsPublishingSet] = useState<string | null>(null)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  useEffect(() => {
    refreshSets()
    // Fetch Sync Jobs
    fetch(`${apiUrl}/api/admin/sync/jobs?limit=5`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .then(data => setRecentJobs(Array.isArray(data) ? data.slice(0, 5) : []))
      .catch(() => {})

    // Fetch Insights
    fetch(`${apiUrl}/api/admin/insights`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .then(data => setRecentInsights(Array.isArray(data) ? data.slice(0, 5) : []))
      .catch(() => {})
  }, [apiUrl, refreshSets])

  useEffect(() => {
    // Fetch Patch Notes
    const qs = new URLSearchParams()
    if (currentSet) qs.set('set_prefix', currentSet)
    
    fetch(`${apiUrl}/api/admin/patch-notes?${qs.toString()}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : {})
      .then((data: any) => setRecentPatches(data.available_patches?.slice(0, 5) || []))
      .catch(() => {})
  }, [apiUrl, currentSet])

  const handlePublishClick = async (e: React.MouseEvent, prefix: string) => {
    e.stopPropagation()
    if (isPublishingSet) return

    setIsPublishingSet(prefix)
    try {
      const res = await fetch(`${apiUrl}/api/admin/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_set: prefix }),
      })
      if (res.ok) {
        refreshSets()
      } else {
        alert('Failed to publish live set')
      }
    } catch (err: any) {
      alert(`Error publishing set: ${err.message}`)
    } finally {
      setIsPublishingSet(null)
    }
  }

  return (
    <div className="dc-page">
      {/* ── Header ── */}
      <div className="dc-header">
        <div>
          <h1 className="dc-title">Command Center</h1>
          <p className="dc-sub">Manage TFT sets, sync data, and view recent activity.</p>
        </div>
      </div>

      {/* ── Set Status Cards ── */}
      <div className="dc-set-grid">
        {availableSets.slice(-3).map(prefix => {
          const isLive = prefix === liveSet
          const isViewing = prefix === currentSet
          const isPublishing = isPublishingSet === prefix

          return (
            <div
              key={prefix}
              className={`dc-set-card ${isViewing ? 'viewing' : ''} ${isLive ? 'live' : ''}`}
              onClick={() => setCurrentSet(prefix)}
            >
              <div className="dc-set-top">
                <span className="dc-set-name">{prefix ? (setLabels[prefix] || prefix.replace('TFT', 'Set ')) : 'Unknown'}</span>
                <div className="dc-set-badges">
                  {isViewing && <span className="dc-badge dc-badge-viewing">VIEWING DATA</span>}
                </div>
              </div>
              
              {/* Info + Publish Action Row */}
              <div className="dc-set-footer-action">
                {isLive ? (
                   <div className="dc-live-status-container">
                      <span className="dc-live-dot"></span>
                      <span className="dc-live-text">CURRENTLY LIVE</span>
                   </div>
                ) : (
                   <button 
                      className="dc-btn-card-publish" 
                      onClick={(e) => handlePublishClick(e, prefix)}
                      disabled={isPublishingSet !== null}
                   >
                     {isPublishing ? 'Publishing...' : '🚀 Publish to Live'}
                   </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Activity Chart ── */}
      <div className="dc-activity-card" style={{ marginBottom: '30px' }}>
        <h3 className="dc-section-title">Overview Activity</h3>
        <DashboardCharts />
      </div>

      {/* ── Bottom Grid (3 Columns) ── */}
      <div className="dc-bottom-grid">
        
        {/* Recent Jobs */}
        <div className="dc-jobs-card">
          <div className="dc-card-top-row">
             <h3 className="dc-section-title-sm">🔄 Recent Syncs</h3>
             <Link href="/admin/sync" className="dc-view-all">View All</Link>
          </div>
          {recentJobs.length === 0 ? (
            <p className="dc-empty">No sync jobs yet.</p>
          ) : (
            <div className="dc-jobs-list">
              {recentJobs.map(job => (
                <div key={job.id} className="dc-job-row">
                  <span className={`dc-job-type ${job.job_type}`}>
                    {job.job_type === 'pipeline' ? '🔄' : job.job_type === 'cdragon' ? '🐉' : '📦'}
                  </span>
                  <div className="dc-job-info">
                    <span className="dc-job-name">{job.job_type} · {job.set_prefix}</span>
                    <span className="dc-job-time">
                      {new Date(job.started_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`dc-job-status ${job.status}`}>
                    {job.status === 'completed' ? '✅' : job.status === 'error' ? '❌' : '⏳'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Patch Notes */}
        <div className="dc-jobs-card">
          <div className="dc-card-top-row">
             <h3 className="dc-section-title-sm">📜 Patch Notes</h3>
             <Link href="/admin/patch-notes" className="dc-view-all">View All</Link>
          </div>
          {recentPatches.length === 0 ? (
            <p className="dc-empty">No patch data for {currentSet}.</p>
          ) : (
            <div className="dc-jobs-list">
              {recentPatches.map(patch => (
                <div key={patch} className="dc-job-row">
                  <span className="dc-job-type">📝</span>
                  <div className="dc-job-info">
                    <span className="dc-job-name">Patch {patch}</span>
                    <span className="dc-job-time">Set {currentSet?.replace('TFT', '')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Insights */}
        <div className="dc-jobs-card">
          <div className="dc-card-top-row">
             <h3 className="dc-section-title-sm">💡 Insights</h3>
             <Link href="/admin/insights" className="dc-view-all">View All</Link>
          </div>
          {recentInsights.length === 0 ? (
            <p className="dc-empty">No insights yet.</p>
          ) : (
            <div className="dc-jobs-list">
              {recentInsights.map(ins => (
                <div key={ins.id} className="dc-job-row">
                  <span className="dc-job-type">
                     {ins.status === 'published' ? '✨' : ins.status === 'pending' ? '⏳' : '🚫'}
                  </span>
                  <div className="dc-job-info">
                    <span className="dc-job-name">{ins.title}</span>
                    <span className="dc-job-time">
                      {new Date(ins.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <style>{`
        .dc-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 10px 0 50px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #222;
        }

        .dc-header { margin-bottom: 35px; }
        .dc-title { font-family: 'Courier New', Courier, serif; font-size: 36px; font-weight: 800; margin: 0 0 6px; color: #222; }
        .dc-sub { font-size: 14px; color: #9A9A9A; margin: 0; }

        /* ── Set Status Cards ── */
        .dc-set-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
        @media (max-width: 900px) { .dc-set-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .dc-set-grid { grid-template-columns: 1fr; } }

        .dc-set-card {
          background: #FFF; border: 2px solid #F0EDEA; border-radius: 16px; padding: 22px;
          cursor: pointer; transition: all 0.25s ease; position: relative;
          display: flex; flex-direction: column; gap: 15px;
        }
        .dc-set-card:hover { border-color: #DDD; box-shadow: 0 8px 25px rgba(0,0,0,0.04); transform: translateY(-2px); }
        .dc-set-card.viewing { border-color: #EB5E28; box-shadow: 0 0 0 3px rgba(235,94,40,0.1); }
        .dc-set-card.live { border-color: #10B981; }
        
        .dc-set-top { display: flex; justify-content: space-between; align-items: flex-start; }
        .dc-set-name { font-family: 'Courier New', Courier, serif; font-size: 24px; font-weight: 800; }
        .dc-set-badges { display: flex; gap: 6px; }
        .dc-badge { font-size: 9px; font-weight: 800; padding: 3px 8px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        .dc-badge-viewing { background: #FEF2E8; color: #EB5E28; }

        .dc-set-footer-action {
           margin-top: auto; padding-top: 15px; border-top: 1px dashed #E8E4DE;
           display: flex; justify-content: flex-end; align-items: center; min-height: 40px;
        }

        .dc-live-status-container {
           display: flex; align-items: center; gap: 6px; padding: 6px 12px;
           background: #ECFDF5; border-radius: 8px; color: #059669; font-weight: 700; font-size: 11px;
           border: 1px solid #A7F3D0;
        }
        .dc-live-dot {
           width: 8px; height: 8px; background: #10B981; border-radius: 50%;
           box-shadow: 0 0 6px rgba(16,185,129,0.5); animation: dc-pulse 2s infinite;
        }
        @keyframes dc-pulse {
           0%, 100% { opacity: 1; transform: scale(1); }
           50% { opacity: 0.5; transform: scale(1.3); }
        }

        .dc-btn-card-publish {
           background: #F8F4EE; color: #EB5E28; border: 1px solid #E8E4DE;
           font-size: 12px; font-weight: 700; padding: 8px 14px; border-radius: 8px;
           cursor: pointer; transition: all 0.2s; width: 100%; text-align: center;
        }
        .dc-btn-card-publish:hover { background: #EB5E28; color: #FFF; border-color: #EB5E28; }
        .dc-btn-card-publish:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Bottom Grid ── */
        .dc-bottom-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
        }

        .dc-activity-card, .dc-jobs-card {
          background: #FFF; border: 1px solid #F0EDEA; border-radius: 16px; padding: 24px;
        }
        .dc-section-title { font-family: 'Courier New', Courier, serif; font-size: 20px; font-weight: 700; margin: 0 0 20px; }
        .dc-section-title-sm { font-family: 'Courier New', Courier, serif; font-size: 16px; font-weight: 700; margin: 0; color: #333; }
        
        .dc-card-top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px dashed #E8E4DE; }

        .dc-jobs-list { display: flex; flex-direction: column; gap: 0; }
        .dc-job-row {
          display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #F8F4EE;
        }
        .dc-job-row:last-child { border-bottom: none; }
        .dc-job-type { font-size: 18px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: #F8F4EE; border-radius: 8px; }
        .dc-job-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .dc-job-name { font-size: 13px; font-weight: 600; color: #222; text-transform: capitalize; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dc-job-time { font-size: 11px; color: #9A9A9A; }
        .dc-job-status { font-size: 12px; font-weight: 600; }
        
        .dc-empty { font-size: 13px; color: #9A9A9A; margin: 20px 0; text-align: center; }
        .dc-view-all {
          font-size: 12px; font-weight: 600; color: #EB5E28; text-decoration: none; padding: 4px 10px; background: #FEF2E8; border-radius: 6px;
        }
        .dc-view-all:hover { background: #EB5E28; color: #FFF; }

        @media (max-width: 1024px) {
          .dc-bottom-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 768px) {
          .dc-bottom-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
