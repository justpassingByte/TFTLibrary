import { CompBuilderClient } from './CompBuilderClient'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default async function AdminCompsPage() {
  let comps: any[] = []
  let champions: any[] = []
  let dbAugments: any[] = []
  let items: any[] = []
  let traitsDb: any[] = []

  try {
    const [compsRes, champsRes, augmentsRes, itemsRes, traitsRes] = await Promise.all([
      fetch(`${API_URL}/api/admin/comps`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/meta/champions`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/meta/augments`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/meta/items`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/meta/traits`, { cache: 'no-store' }),
    ])

    if (compsRes.ok) {
      const allComps = await compsRes.json()
      // Separate parents and variants
      const parents = allComps.filter((c: any) => !c.parent_comp_id)
      const variants = allComps.filter((c: any) => c.parent_comp_id)

      // Group variants under parents
      const variantMap: Record<string, any[]> = {}
      variants.forEach((v: any) => {
        if (!variantMap[v.parent_comp_id]) variantMap[v.parent_comp_id] = []
        variantMap[v.parent_comp_id].push(v)
      })

      comps = parents.map((c: any) => ({ ...c, variants: variantMap[c.id] || [] }))
    }

    if (champsRes.ok) champions = await champsRes.json()
    if (augmentsRes.ok) dbAugments = (await augmentsRes.json()).map((a: any) => ({ id: a.id, tier: a.tier, name: a.name, icon: a.icon }))
    if (itemsRes.ok) items = await itemsRes.json()
    if (traitsRes.ok) traitsDb = await traitsRes.json()
  } catch (e) {}

  return (
    <CompBuilderClient
      comps={comps}
      champions={champions}
      dbAugments={dbAugments}
      items={items}
      traitsDb={traitsDb}
    />
  )
}
