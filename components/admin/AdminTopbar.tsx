import { createClient } from '@/lib/supabase/server'
import { AdminTopbarClient } from './AdminTopbarClient'

export async function AdminTopbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch last sync job for status badge
  const { data: lastJob } = await supabase
    .from('sync_jobs')
    .select('status, ddragon_version, finished_at')
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <AdminTopbarClient
      userEmail={user?.email ?? null}
      lastSyncStatus={lastJob?.status ?? null}
      lastSyncVersion={lastJob?.ddragon_version ?? null}
      lastSyncAt={lastJob?.finished_at ?? null}
    />
  )
}
