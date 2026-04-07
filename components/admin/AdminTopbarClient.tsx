'use client'

import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const ROUTE_LABELS: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/sync': 'Data Sync',
  '/admin/augments': 'Augments',
  '/admin/champions': 'Champions',
  '/admin/insights': 'Insights',
  '/admin/users': 'Users',
}

interface Props {
  userEmail: string | null
  lastSyncStatus: string | null
  lastSyncVersion: string | null
  lastSyncAt: string | null
}

export function AdminTopbarClient({ userEmail, lastSyncStatus, lastSyncVersion, lastSyncAt }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const pageLabel = ROUTE_LABELS[pathname] ?? 'Admin'

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const statusColor =
    lastSyncStatus === 'completed' ? '#4ade80'
    : lastSyncStatus === 'error' ? '#f87171'
    : lastSyncStatus === 'running' ? '#fbbf24'
    : '#6b7280'

  return (
    <header className="admin-topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">{pageLabel}</h1>
      </div>

      <div className="topbar-right">
        {lastSyncStatus && (
          <div className="topbar-sync-badge" title={lastSyncAt ? `Last sync: ${new Date(lastSyncAt).toLocaleString()}` : ''}>
            <span className="sync-dot" style={{ background: statusColor }} />
            <span className="sync-label">
              {lastSyncVersion ? `v${lastSyncVersion}` : 'No sync'}
            </span>
          </div>
        )}

        <div className="topbar-user">
          <div className="user-avatar" aria-hidden>
            {userEmail ? userEmail[0].toUpperCase() : '?'}
          </div>
          <span className="user-email">{userEmail ?? 'Unknown'}</span>
          <button
            id="topbar-signout"
            className="topbar-signout"
            onClick={handleSignOut}
            aria-label="Sign out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        .admin-topbar {
          height: 56px;
          min-height: 56px;
          background: #0d0b1a;
          border-bottom: 1px solid rgba(167, 139, 250, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.5rem;
          gap: 1rem;
        }

        .topbar-title {
          font-size: 1rem;
          font-weight: 600;
          color: #f1effe;
          margin: 0;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .topbar-sync-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(167, 139, 250, 0.12);
          border-radius: 20px;
          padding: 0.25rem 0.75rem;
          cursor: default;
        }

        .sync-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .sync-label {
          font-size: 0.78rem;
          font-weight: 500;
          color: #9d96c0;
          font-variant-numeric: tabular-nums;
        }

        .topbar-user {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .user-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
        }

        .user-email {
          font-size: 0.82rem;
          color: #9d96c0;
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .topbar-signout {
          background: none;
          border: none;
          color: #7c75a0;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          transition: color 0.15s;
        }

        .topbar-signout:hover {
          color: #f87171;
        }

        @media (max-width: 600px) {
          .user-email { display: none; }
        }
      `}</style>
    </header>
  )
}
