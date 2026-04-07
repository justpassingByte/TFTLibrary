import { SyncPageClient } from './SyncPageClient'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default async function SyncPage() {
  let recentJobs: any[] = []
  try {
    const res = await fetch(`${API_URL}/api/admin/sync/jobs`, { cache: 'no-store' })
    if (res.ok) recentJobs = await res.json()
  } catch (e) {}

  return <SyncPageClient recentJobs={recentJobs} />
}
