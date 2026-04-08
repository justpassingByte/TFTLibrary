import { AugmentsTierlistClient, type AugmentMeta } from './AugmentsTierlistClient';

export const dynamic = 'force-dynamic';


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default async function AugmentsTierlistPage() {
  let augments: AugmentMeta[] = [];

  try {
    let setPrefix = 'TFT16';
    try {
      const settingsRes = await fetch(`${API_URL}/api/admin/settings`, { cache: 'no-store' });
      if (settingsRes.ok) setPrefix = (await settingsRes.json()).active_set || 'TFT16';
    } catch(e) {}

    const [augmentsRes, statsRes] = await Promise.all([
      fetch(`${API_URL}/api/meta/augments?set_prefix=${setPrefix}`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/meta/stats/augments?set_prefix=${setPrefix}`, { cache: 'no-store' }).catch(() => null),
    ]);

    const augmentsArr = augmentsRes.ok ? await augmentsRes.json() : [];
    const statsArr = statsRes?.ok ? await statsRes.json() : [];

    // Build stats lookup: augment_id -> stats
    const statsMap: Record<string, any> = {};
    (Array.isArray(statsArr) ? statsArr : []).forEach((s: any) => { statsMap[s.augment_id] = s; });

    // Only show augments that admin has assigned a meta_tier
    augments = augmentsArr
      .filter((dbAug: any) => dbAug.meta_tier)
      .map((dbAug: any) => {
        const stats = statsMap[dbAug.id];
        return {
          id: dbAug.id,
          name: dbAug.name,
          description: dbAug.description || null,
          icon: dbAug.icon || null,
          rarity: dbAug.tier || 'Gold',       // Silver/Gold/Prismatic
          tier: dbAug.meta_tier,               // S/A/B/C/D
          avg_placement: stats?.avg_placement ?? null,
          top4_rate: stats?.top4_rate ?? null,
          win_rate: stats?.win_rate ?? null,
          sample_count: stats?.sample_count ?? null,
        };
      });
  } catch (e) {
    console.error('Augments tierlist fetch error:', e);
  }

  return <AugmentsTierlistClient augments={augments} />;
}
