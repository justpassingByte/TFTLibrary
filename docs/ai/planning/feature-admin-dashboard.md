---
title: Admin Dashboard Planning
type: planning
status: draft
---

# Implementation Plan: Admin Dashboard

## Dependencies (Must Exist Before Any Phase)
- Supabase project provisioned (Auth + PostgreSQL)
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars set
- `supabase` and `@supabase/ssr` npm packages installed

---

## Phase 1: Infrastructure & Auth Shell ✅

- [x] Install Supabase client packages: `npm install @supabase/supabase-js @supabase/ssr`
- [x] Create `lib/supabase/server.ts` and `lib/supabase/client.ts` helpers (SSR-safe client factories)
- [x] Run DB migrations: see `scripts/migrate-admin.sql` — run in Supabase SQL Editor
- [x] Add Supabase DB trigger: auto-insert `profiles` row on `auth.users` insert (in migration SQL)
- [x] Create `app/login/page.tsx` — email/password login form using Supabase Auth; redirects to `/admin` on success
- [x] Create `middleware.ts` — protect `/admin/*` routes (admin only), `/admin/insights` (admin + moderator), and `/insights/new` (authenticated only). Unauthenticated users redirect to `/login`.
- [x] Create `app/admin/layout.tsx` — full-screen admin shell (sidebar + topbar), suppressing global Header/Footer
- [x] Build `AdminSidebar` and `AdminTopbar` components under `components/admin/`
- [x] Build `app/admin/page.tsx` — Overview page with metric cards and quick actions
- [x] Build `app/admin/error.tsx` — error boundary for admin section

> **⚠️ Blocker before Phase 2:** Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_KEY` in `.env.local`, then run `scripts/migrate-admin.sql` in the Supabase SQL Editor. Promote your account to admin with: `UPDATE public.profiles SET role = 'admin' WHERE id = '<your-uuid>';`

---

## Phase 2: Sync Script Parameterization + Sync UI ✅

- [x] Update `scripts/download-riot-data.mjs`:
  - Reads `DDRAGON_VERSION`, `TFT_SET_PREFIX`, `SUPABASE_SERVICE_KEY`, `SYNC_JOB_ID` from env
  - All hardcoded `TFT16_` prefix checks replaced with `${TFT_SET_PREFIX}_`
  - Upserts champions/traits into Supabase; upserts augments preserving admin-set tier/tags
  - Updates `sync_jobs` record on completion/error
- [x] Create `POST /api/admin/sync/trigger` — creates `sync_jobs` record, returns `job_id`
- [x] Create `GET /api/admin/sync/stream` — SSE stream that spawns script child process, pipes stdout/stderr, sends `done` event, persists log
- [x] Build `SyncConsole` component — EventSource consumer with terminal-style log display
- [x] Build `ActionCard` component — reusable CTA card with loading state
- [x] Build `app/admin/sync/page.tsx` — version inputs + DDragon ActionCard + SyncConsole + recent jobs table

---

## Phase 3: Game Data Management ✅

### Augments
- [x] Build `AugmentsPageClient` component (inline tier picker popover + tag add/remove with datalist presets)
- [x] Create Server Actions: `getAugments(set_prefix)`, `updateAugment(id, patch)` in `app/admin/augments/actions.ts`
- [x] Build `app/admin/augments/page.tsx`

### Champions
- [x] Build `ChampionsPageClient` component (expandable row with searchable trait multi-select grid)
- [x] Create Server Actions: `getChampions(set_prefix)`, `getTraits(set_prefix)`, `updateChampionTraits(champion_id, trait_names[])` in `app/admin/champions/actions.ts`
  - Action writes back to `lib/champion-traits.json`
- [x] Build `app/admin/champions/page.tsx`

---

## Phase 4: Insight Platform (Public + Admin)

- [ ] Create Server Actions: `submitInsight`, `getInsights(status?)`, `moderateInsight(id, action)`
- [ ] Build public `app/insights/page.tsx` — approved posts feed
- [ ] Build `app/insights/[id]/page.tsx` — single post reading view (markdown rendered)
- [ ] Build `app/insights/new/page.tsx` — submission form (auth required)
- [ ] Build `InsightModerationRow` component
- [ ] Build `app/admin/insights/page.tsx` — pending queue + moderation actions

---

## Phase 5: Users & Overview Dashboard

- [ ] Create Server Actions: `getUsers()`, `updateUserRole(user_id, role)`
- [ ] Build `UserRow` component
- [ ] Build `app/admin/users/page.tsx`
- [ ] Build `MetricCard` component
- [ ] Build `StatusBadge` component
- [ ] Update `app/admin/page.tsx` — system monitoring view:
  - Last successful sync (from `sync_jobs`)
  - Current DDragon version in use
  - Active user count
  - Pending insight count

---

## Implementation Order
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

## Critical Dependencies
- Phase 2 requires Phase 1 (Supabase client + middleware must exist first)
- Phase 3 requires Phase 2 (champions/augments tables populated by sync)
- Phase 4 requires Phase 1 (auth for insight submission)
- Phase 5 requires Phases 1–4 (queries all tables)
