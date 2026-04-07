import { getAugments } from './actions'
import { AugmentsPageClient } from './AugmentsPageClient'

export default async function AugmentsPage() {
  // Fetch all active augments instead of hardcoding
  const augments = await getAugments().catch(() => [])
  return <AugmentsPageClient augments={augments} />
}
