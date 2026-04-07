import { createServiceClient } from '@/lib/supabase/server';
import { TierlistClient } from './TierlistClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default async function TierlistPage() {
  let champions: any[] = [];
  let dbAugments: any[] = [];
  let items: any[] = [];
  let traitsDb: any[] = [];

  try {
    const [champsRes, augmentsRes, itemsRes, traitsRes] = await Promise.all([
      fetch(`${API_URL}/api/meta/champions`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/meta/augments`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/meta/items`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/meta/traits`, { cache: 'no-store' }),
    ]);

    if (champsRes.ok) champions = await champsRes.json();
    if (augmentsRes.ok) dbAugments = await augmentsRes.json();
    if (itemsRes.ok) items = await itemsRes.json();
    if (traitsRes.ok) traitsDb = await traitsRes.json();
  } catch (e) {
    console.error('[TIERLIST PAGE] Fetch error:', e);
  }

  return (
    <TierlistClient 
      champions={champions}
      dbAugments={dbAugments} 
      items={items}
      traitsDb={traitsDb}
    />
  );
}
