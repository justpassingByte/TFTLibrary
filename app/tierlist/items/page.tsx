import { ItemsTierlistClient } from './ItemsTierlistClient';
import { categorizeItem } from '@/app/builder/builder-data';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default async function ItemsTierlistPage() {
  let items: any[] = [];

  try {
    let setPrefix = 'TFT16';
    try {
      const settingsRes = await fetch(`${API_URL}/api/admin/settings`, { cache: 'no-store' });
      if (settingsRes.ok) setPrefix = (await settingsRes.json()).active_set || 'TFT16';
    } catch(e) {}

    const [tiersRes, statsRes, itemsRes] = await Promise.all([
      fetch(`${API_URL}/api/admin/item-tiers`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/meta/stats/items?set_prefix=${setPrefix}`, { cache: 'no-store' }).catch(() => null),
      fetch(`${API_URL}/api/meta/items?set_prefix=${setPrefix}`, { cache: 'no-store' })
    ]);

    const tiersData = tiersRes.ok ? await tiersRes.json() : { data: [] };
    const adminTiersArr = tiersData.data || [];
    const statsArr = statsRes?.ok ? await statsRes.json() : [];
    const metaItemsArr = itemsRes.ok ? await itemsRes.json() : [];

    // Build admin tiers lookup: item_id -> tier (S/A/B/C/D)
    const adminTiers: Record<string, string> = {};
    adminTiersArr.forEach((t: any) => { adminTiers[t.item_id] = t.tier; });

    // Build stats lookup
    const statsMap: Record<string, any> = {};
    (Array.isArray(statsArr) ? statsArr : []).forEach((s: any) => { statsMap[s.item_name] = s; });

    items = metaItemsArr
      .filter((item: any) => adminTiers[item.id])
      .map((item: any) => {
        const DBcat = categorizeItem(item.id) || 'Unknown';
        const stats = statsMap[item.id];
        let catStr = DBcat as string;
        if (catStr === 'Components' || catStr === 'Completed') catStr = 'Craftable';
        if (catStr === 'Artifacts') catStr = 'Artifact';
        if (catStr === 'Radiants') catStr = 'Radiant';
        if (catStr === 'Emblems') catStr = 'Support'; // Or handle Emblems
        
        return {
          id: item.id,
          name: item.name,
          icon: item.icon || null,
          tier: adminTiers[item.id],
          category: catStr, // Ensure category is included
          avg_placement: stats?.avg_placement ?? null,
          top4_rate: stats?.top4_rate ?? null,
          usage_count: stats?.usage_count ?? null,
        };
      });
  } catch (e) {
    console.error('[ITEMS PAGE] Fetch error:', e);
  }

  return <ItemsTierlistClient items={items} />;
}
