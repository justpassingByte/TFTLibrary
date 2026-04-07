'use server'

import { revalidatePath } from 'next/cache'

export interface Champion {
  id: string
  name: string
  cost: number
  icon: string | null
  set_prefix: string
  traits: string[]
}

export interface Trait {
  id: string
  name: string
  icon?: string | null
  set_prefix: string
}

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function getChampions(set_prefix?: string): Promise<Champion[]> {
  try {
    const url = new URL(`${getApiUrl()}/api/meta/champions`);
    if (set_prefix) url.searchParams.set('set_prefix', set_prefix);
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch champions');
    return await res.json() as Champion[];
  } catch (error) {
    console.error('getChampions error:', error);
    return [];
  }
}

export async function getTraits(set_prefix?: string): Promise<Trait[]> {
  try {
    const url = new URL(`${getApiUrl()}/api/meta/traits`);
    if (set_prefix) url.searchParams.set('set_prefix', set_prefix);
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch traits');
    return await res.json() as Trait[];
  } catch (error) {
    console.error('getTraits error:', error);
    return [];
  }
}

export async function updateChampionTraits(champion_id: string, trait_names: string[]) {
  const res = await fetch(`${getApiUrl()}/api/admin/champions/${champion_id}/traits`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ traits: trait_names })
  });

  if (!res.ok) throw new Error(await res.text());

  revalidatePath('/admin/champions')
  revalidatePath('/builder')
  revalidatePath('/tierlist-maker')
}

export async function updateChampionIcon(champion_id: string, icon_url: string) {
  const res = await fetch(`${getApiUrl()}/api/admin/champions/${champion_id}/icon`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ icon: icon_url })
  });

  if (!res.ok) throw new Error(await res.text());

  revalidatePath('/admin/champions')
  revalidatePath('/builder')
  revalidatePath('/tierlist-maker')
}
