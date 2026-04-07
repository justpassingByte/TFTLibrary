import { getChampions, getTraits } from './actions'
import { ChampionsPageClient } from './ChampionsPageClient'

export default async function ChampionsPage() {
  const [champions, traits] = await Promise.all([
    getChampions('all').catch(() => []),
    getTraits('all').catch(() => []),
  ])
  return <ChampionsPageClient champions={champions} traits={traits} />
}
