---
title: Champion Avatar Editor
type: planning
status: draft
---

# Planning: Champion Avatar Editor

## Task Breakdown

### Phase 1: Avatar Editor Component
1. Create the `AvatarEditor` component shell in `app/admin/champions/components/AvatarEditor.tsx`.
2. Implement CSS structure (fixed sized circular frame, absolute positioned image).
3. Implement dragging logic using pointer events to update `x` and `y` state.
4. Implement zooming logic via wheel/slider to update `scale`.

### Phase 2: Canvas Export implementation
1. Implement the Canvas drawing logic within the component upon Save trigger.
2. Output a 128x128 PNG blob using `ctx.setTransform` and `ctx.drawImage`.

### Phase 3: Integration and Saving Actions
1. Update `app/admin/champions/actions.ts` to include a server action that updates the database entry for the champion (saving new `avatar_url`).
2. Add logic to upload the Canvas-generated image blob directly to Supabase storage.
3. Integrate `AvatarEditor` into `ChampionsPageClient.tsx`. When clicking an avatar, display the editor inline.
4. Wire up the save function to execute upload -> db update -> revalidate path.

## Dependencies
- Proper Supabase storage bucket needs to be set up (e.g., `champion-avatars`) with public read access and authenticated upload.
- React/NextJS environment with Server Actions.

## Effort Estimates
- Phase 1: 1-1.5 hours
- Phase 2: ~30-45 minutes
- Phase 3: 1 hour

## Implementation Order
1. Phase 1 (UI Component)
2. Phase 2 (Canvas logic)
3. Phase 3 (Supabase + Next.js actions integration)
