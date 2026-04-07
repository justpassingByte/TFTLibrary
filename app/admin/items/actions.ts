'use server'

import { revalidatePath } from 'next/cache'

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function upsertItemTier(itemId: string, tier: string, patch: string) {
  const res = await fetch(`${getApiUrl()}/api/admin/items/tier`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId, tier, patch })
  });
  if (!res.ok) throw new Error(await res.text());
  revalidatePath('/admin/items')
}

export async function bulkUpsertItemTiers(items: { item_id: string; tier: string }[], patch: string) {
  const res = await fetch(`${getApiUrl()}/api/admin/items/tier/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, patch })
  });
  if (!res.ok) throw new Error(await res.text());
  revalidatePath('/admin/items')
}

export async function updateAugmentMetaTier(augmentId: string, metaTier: string | null) {
  const res = await fetch(`${getApiUrl()}/api/admin/augments/${augmentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: metaTier }) // We mapped tier in backend mock
  });
  if (!res.ok) throw new Error(await res.text());
  revalidatePath('/admin/augments')
}
