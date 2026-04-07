'use server'

import { revalidatePath } from 'next/cache'

export interface Augment {
  id: string
  name: string
  description: string | null
  icon: string | null
  tier: 'Silver' | 'Gold' | 'Prismatic'
  meta_tier?: string | null
  tags: string[]
  set_prefix: string
  updated_at: string
}

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function getAugments(set_prefix?: string): Promise<Augment[]> {
  try {
    const url = new URL(`${getApiUrl()}/api/meta/augments`);
    if (set_prefix) url.searchParams.set('set_prefix', set_prefix);

    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch augments');
    return await res.json() as Augment[];
  } catch (error) {
    console.error('getAugments error:', error);
    return [];
  }
}

export async function updateAugment(
  id: string,
  patch: { tier?: string; tags?: string[] },
) {
  // BYPASS AUTH as requested
  const res = await fetch(`${getApiUrl()}/api/admin/augments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });

  if (!res.ok) throw new Error(await res.text());

  // Also handle local file updates using the API route since this is now out of Supabase
  // We will let the Node backend handle hot-patching Postgres 
  
  revalidatePath('/admin/augments')
  revalidatePath('/builder')
  revalidatePath('/tierlist-maker')
}

export async function bulkUpdateAugments(payload: { id: string; meta_tier?: string | null; tier?: number }[]) {
  // BYPASS AUTH as requested
  const res = await fetch(`${getApiUrl()}/api/admin/augments/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload })
  });

  if (!res.ok) throw new Error(await res.text());

  revalidatePath('/admin/augments')
}
