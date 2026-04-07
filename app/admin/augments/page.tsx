import { getAugments } from './actions'
import { AugmentsPageClient } from './AugmentsPageClient'

export default async function AugmentsPage() {
  // Fetch all augments across all sets — filtering happens client-side via AdminSetContext
  const augments = await getAugments('all').catch(() => [])
  return <AugmentsPageClient augments={augments} />
}
