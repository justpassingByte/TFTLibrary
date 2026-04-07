import { ItemsTierlistClient } from './ItemsTierlistClient'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default async function AdminItemsPage() {
  let itemTiers: any[] = []
  let itemStats: any[] = []
  let items: any[] = []

  try {
    let setPrefix = 'TFT16';
    try {
      const settingsRes = await fetch(`${API_URL}/api/admin/settings`, { cache: 'no-store' });
      if (settingsRes.ok) setPrefix = (await settingsRes.json()).active_set || 'TFT16';
    } catch(e) {}

    const [tiersRes, statsRes, itemsRes] = await Promise.all([
      fetch(`${API_URL}/api/admin/item-tiers`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/meta/stats/items?set_prefix=${setPrefix}`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/meta/items?set_prefix=${setPrefix}`, { cache: 'no-store' }),
    ])

    if (tiersRes.ok) {
      const tiersData = await tiersRes.json()
      itemTiers = tiersData.data || []
    }
    if (statsRes.ok) {
      const statsData = await statsRes.json()
      itemStats = statsData
    }
    if (itemsRes.ok) {
      items = await itemsRes.json()
    }
  } catch (e) {}

  return (
    <ItemsTierlistClient
      itemTiers={itemTiers}
      itemStats={itemStats}
      items={items}
    />
  )
}
