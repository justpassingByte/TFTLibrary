import { CompsTierlistClient } from './CompsTierlistClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default async function TierlistCompsPage() {
  let comps: any[] = [];
  let traitsMap: Record<string, string[]> = {};
  let champions: any[] = [];
  let items: any[] = [];
  let setPrefix = 'TFT16';

  try {
    try {
      const settingsRes = await fetch(`${API_URL}/api/admin/settings`, { cache: 'no-store' });
      if (settingsRes.ok) {
        setPrefix = (await settingsRes.json()).active_set || 'TFT16';
      }
    } catch(e) {}

    const [compsRes, champsRes, itemsRes] = await Promise.all([
      fetch(`${API_URL}/api/meta/curated-comps?set_prefix=${setPrefix}`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/meta/champions?set_prefix=${setPrefix}`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/meta/items?set_prefix=${setPrefix}`, { cache: 'no-store' }),
    ]);

    if (compsRes.ok) {
      const data = await compsRes.json();
      if (Array.isArray(data)) {
        comps = data;
        traitsMap = {};
      } else {
        comps = data.data || [];
        traitsMap = data.traitsMap || {};
      }
    }

    if (champsRes.ok) {
      const champsData = await champsRes.json();
      champions = champsData.map((c: any) => ({
        id: c.id,
        name: c.name,
        cost: c.cost,
        icon: c.icon || null,
        traits: c.traits || [],
      }));

      // if traitsMap wasn't provided by the backend, build it manually
      if (Object.keys(traitsMap).length === 0) {
        champions.forEach((c: any) => {
          traitsMap[c.id] = c.traits || [];
        });
      }
    }

    if (itemsRes.ok) {
      const itemsData = await itemsRes.json();
      items = itemsData.map((i: any) => ({
        id: i.id,
        name: i.name,
        icon: i.icon || null,
      }));
    }
  } catch (e) {
    console.error('Comps tierlist fetch error:', e);
  }

  let augments: any[] = [];
  let traitsDb: any[] = [];
  try {
    const [augsRes, traitsRes] = await Promise.all([
      fetch(`${API_URL}/api/meta/augments?set_prefix=${setPrefix}`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/meta/traits?set_prefix=${setPrefix}`, { cache: 'no-store' }),
    ]);
    if (augsRes.ok) augments = await augsRes.json();
    if (traitsRes.ok) traitsDb = await traitsRes.json();
  } catch(e) {}

  return (
    <CompsTierlistClient
      comps={comps}
      traitsMap={traitsMap}
      champions={champions}
      items={items}
      augments={augments}
      traitsDb={traitsDb}
    />
  );
}
