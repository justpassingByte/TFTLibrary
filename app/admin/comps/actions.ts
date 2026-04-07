'use server'

import { revalidatePath } from 'next/cache'

// ── Types ────────────────────────────────────────────────────
export interface CompChampion {
  id: string
  star: number
  is_carry: boolean
  items?: string[]
}

export interface AltBuild {
  carry_id: string
  items: string[]
}

export interface StagePlan {
  stage: string
  text: string
}

export interface BoardPosition {
  champion_id: string
  row: number
  col: number
}

export interface CuratedCompData {
  name: string
  tier: string
  carry_id: string
  playstyle: string
  difficulty: string
  champions: CompChampion[]
  active_traits?: { name: string; count: number }[]
  early_units: string[]
  flex_units: string[]
  item_priority: string[]
  alt_builds: AltBuild[]
  augments: string[]
  augment_priority: string[]
  board_positions: BoardPosition[]
  tips: string
  stage_plans: StagePlan[]
  parent_comp_id: string | null
  variant_label: string
  patch: string
  sort_order: number
  is_published: boolean
}

export type CuratedComp = CuratedCompData & { id: string; created_at: string; updated_at: string }

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// ── Create Comp ──────────────────────────────────────────────
export async function createComp(data: CuratedCompData) {
  const res = await fetch(`${getApiUrl()}/api/admin/comps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(await res.text());
  
  revalidatePath('/admin/comps')
  return await res.json()
}

// ── Update Comp ──────────────────────────────────────────────
export async function updateComp(id: string, data: Partial<CuratedCompData>) {
  const res = await fetch(`${getApiUrl()}/api/admin/comps/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(await res.text());
  
  revalidatePath('/admin/comps')
}

// ── Delete Comp ──────────────────────────────────────────────
export async function deleteComp(id: string) {
  const res = await fetch(`${getApiUrl()}/api/admin/comps/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
  
  revalidatePath('/admin/comps')
}

// ── Publish / Unpublish ──────────────────────────────────────
export async function togglePublish(id: string, published: boolean) {
  const res = await fetch(`${getApiUrl()}/api/admin/comps/${id}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ published })
  });
  if (!res.ok) throw new Error(await res.text());
  
  revalidatePath('/admin/comps')
}

// ── Duplicate Comp ───────────────────────────────────────────
export async function duplicateComp(id: string) {
  const res = await fetch(`${getApiUrl()}/api/admin/comps/${id}/duplicate`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
  
  revalidatePath('/admin/comps')
}
