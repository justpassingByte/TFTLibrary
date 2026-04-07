---
title: Champion Avatar Editor
type: implementation
status: completed
---

# Implementation: Champion Avatar Editor

## Components Created & Modified

### `app/admin/champions/AvatarEditor.tsx` (New)
Created an inline modal component used for visual crop editing. 
- Utilizes an off-screen HTML5 `<canvas>` to generate a 128x128 cropped PNG.
- Directly uploads the Blob via `@supabase/ssr` bucket to `avatars/champs/{id}-avatar-v{timestamp}.png`.
- Handles interactive pointer dragging (Translate) and mouse wheel (Scale).

### `app/admin/champions/ChampionsPageClient.tsx` (Modified)
- Added `onClick` handlers to Champion Cards on the left panel grid.
- If a card is clicked (not dragged), it sets `editingChamp` state and opens the `AvatarEditor` modal overlay with blur backdrop.
- Reloads local router data upon successful edit to show changes immediately.

### `app/admin/champions/actions.ts` (Modified)
- Added Next.js server action `updateChampionIcon` to push `PATCH /api/admin/champions/:id/icon` to the backend. Next, `revalidatePath` handles cache clearing.

### `backend/src/routes/admin.routes.ts` (Modified)
- Implemented `PATCH /champions/:id/icon` payload processor updating `icon` in Prisma directly returning `{ success: true }`.

### `backend/scripts/sync-cdragon.mjs` (Modified)
- Adjusted background CDragon ingestion script so that it **will not overwrite** any manually edited `http://...` image URLs on sub-sequent runs. It pulls `id, icon` prior to upserting and compares prefix string format.

## Architecture Notes
- The pre-existing logic in `ChampionAvatar` already renders raw `https://` direct-links inherently nicely. Bypassing the normal CDragon routing path logic completely.
- Storage size bloat is mitigated slightly by overwriting `avatars` objects securely on Supabase but uses timestamp versioning in front of the Next.js cache.

## Known Challenges Handled
- Translating CSS Object-Fit layout logic manually down into pure Canvas API required a smart ratio setup using `<canvas width="128">` scaling with bounding client sizing (`imgRef.current.naturalWidth` mapping directly down into the 80x80 fixed frame view). Responsive without visual stretch.

## Next Steps
- Verify visually on staging/live dashboards.
- Potentially extend this similar React Canvas flow to Items or Augments later if Riot assets are cropped poorly there.
