import { BuilderClient } from './BuilderClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default async function BuilderPage() {
  let champions: any[] = [];
  let dbAugments: any[] = [];
  let items: any[] = [];
  let traitsDb: any[] = [];

  try {
    let setPrefix = 'TFT16';
    try {
      const settingsRes = await fetch(`${API_URL}/api/admin/settings`, { cache: 'no-store' });
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setPrefix = settings.active_set || 'TFT16';
      }
    } catch(e) {}

    const [champsRes, augmentsRes, itemsRes, traitsRes] = await Promise.all([
      fetch(`${API_URL}/api/meta/champions?set_prefix=${setPrefix}`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/meta/augments?set_prefix=${setPrefix}`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/meta/items?set_prefix=${setPrefix}`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/meta/traits?set_prefix=${setPrefix}`, { cache: 'no-store' }),
    ]);

    if (champsRes.ok) champions = await champsRes.json();
    if (augmentsRes.ok) dbAugments = await augmentsRes.json();
    if (itemsRes.ok) items = await itemsRes.json();
    if (traitsRes.ok) traitsDb = await traitsRes.json();
  } catch (e) {
    console.error('[BUILDER PAGE] Fetch error:', e);
  }

  return (
    <BuilderClient 
      champions={champions}
      dbAugments={dbAugments} 
      items={items}
      traitsDb={traitsDb}
    />
  );
}
