---
title: Admin Dashboard Requirements
type: requirement
status: draft
---

# Feature: Admin Dashboard

## Problem Statement

Managing a TFT analytics and content platform requires centralized control over dynamic game data (from the Riot API DDragon CDN), community-submitted content (Insights), users, and system health. Currently there is no `/admin` route, no admin UI, and no Insight system. The owner must manually run a local script (`scripts/download-riot-data.mjs`) to refresh static asset data and has no way to manage community content or users from within the app. The Admin Dashboard addresses this by providing a single, secure management surface.

## Target Audience

- **System Admin (Platform Owner)** — primary user; full access to all sections.
- **Content Moderators** — secondary; access scoped to Insight moderation only.

## Current Product Baseline

Existing routes in `app/`:

| Route | Description |
|---|---|
| `/` | Home / landing page |
| `/builder` | Team Builder tool |
| `/meta` | Meta overview (comps, augments, items, traits) |
| `/tierlist` | Community tier list viewer |
| `/tierlist-maker` | Tier list creation tool |
| `/patch-notes` | Patch note display page |
| `/studyhall` | Learning content page |
| `/pricing` | Pricing page (no active subscription gating for MVP) |

**Existing infrastructure relevant to this feature:**

- `scripts/download-riot-data.mjs` — A Node.js ESM script that fetches TFT static data (champions, traits, augments, items) from the Riot DDragon CDN, applies manual tier overrides from `lib/augment-tiers.json`, and writes output to `lib/generated-data.ts`. Currently hardcoded to set prefix `TFT16_`; needs to be parameterized to `TFT17_` (and future sets).
- `lib/augment-tiers.json` — Manual augment tier override map, read and written by the sync script.
- `lib/champion-traits.json` — Manual champion-to-trait assignment map (`champion_id → string[]`). The sync script reads this file and applies it when generating champion records. **Currently all entries are for TFT16 champions and traits are unassigned for TFT17.** There is no UI to manage these assignments today.
- `lib/generated-data.ts` — Auto-generated TypeScript data file consumed by frontend components. Champions reference only traits that exist in `GENERATED_TRAITS`.
- **No `/admin` route exists today.**
- **No auth system exists today.** Must be added as part of this feature.
- **No database (Supabase) is connected today.** Must be provisioned.
- **No Insight content system exists today.** Must be built as part of this feature.

## Riot API & Data Pipeline Context

The platform integrates a 4-layer TFT analytics pipeline on top of the DDragon static data sync:

1. **Ingestion** — Fetch top-ladder players (Challenger, Grandmaster, Master) from NA1, EUW1, VN2; collect their recent match IDs and full match details via the Riot Match v1 API.
2. **Processing** — Transform raw match data into structured entities: player match records, unit data (champion, star level, items), augments, traits, and patch detection.
3. **Aggregation** — Compute comp signatures (top 5–7 core units hashed into a `comp_id`), and derive comp/augment/item/trait stats (pick rate, avg placement, win rate, top-4 rate).
4. **Serving** — Expose aggregated data via internal API routes (`/meta/comps`, `/meta/augments`, `/meta/items`, `/meta/traits`, `/player/{puuid}`).

The Admin Dashboard provides operational control over Layer 1 (sync trigger) and is the primary interface for overriding metadata that the Riot API does not provide reliably (augment tiers, classification tags).

## Goals

- **Data Sync Control**: Allow the admin to trigger `download-riot-data.mjs` (parameterized for `TFT17_`) from the dashboard UI and stream its console output back in real time.
- **Augment Metadata Management**: View all augments and edit their tier and classification tags inline, with instant persistence to Supabase.
- **Champion Trait Assignment**: View all champions synced from DDragon and assign or correct their trait list from the set's known trait pool, with changes persisted to Supabase and back-written to `lib/champion-traits.json` for the sync script to consume.
- **Insight System**: A community content feature where any authenticated user can submit an Insight post; admins and moderators can approve or reject pending submissions.
- **User Management**: View all registered users (via Supabase Auth), see their roles, and manually promote/demote roles (admin, moderator, user).
- **System Monitoring**: Top-level dashboard view showing last sync time, data version (DDragon patch), and recent sync job history.

## Non-Goals

- Real-time multiplayer synchronization inside the dashboard.
- Complex analytics charts or data visualization (tabular data only for MVP).
- Subscription or payment management — no subscription gating in MVP.
- ML-based meta prediction (future extension).
- Multi-region sync scheduling / cron automation (MVP is manual trigger only).
- Rich text / WYSIWYG editor for Insight posts (plain text + markdown for MVP).

## User Stories

1. **As an Admin**, I can view a list of all augments with their current tier and tags, and update them inline with changes saved immediately to the database.
2. **As an Admin**, I can press a "Sync TFT17 Data" button that executes `download-riot-data.mjs` server-side (with `TFT17_` prefix), streams the log output to my screen, and records the sync job result.
3. **As an Admin**, I can view all champions for the current set and assign or edit their trait list from a multi-select of available traits, with changes saved immediately.
4. **As an Admin or Moderator**, I can write and submit an Insight post (a short-form analysis or tip about the current meta); the post enters a pending state until approved.
5. **As an Admin or Moderator**, I can view all pending Insight submissions, preview their content, and approve or reject them; approved posts become publicly visible.
6. **As an Admin**, I can view the full user list, see each user's role and registration date, and promote or demote their role.
7. **As an Admin**, I can view a top-level dashboard that shows the last successful sync time, the current DDragon data version, and recent sync job history.
8. **As an Admin**, I can log in via email/password at `/login` and am redirected to `/admin` on success.

## Critical Flows

### Flow 1: DDragon Data Sync (TFT17)
1. Admin navigates to `/admin/sync`.
2. Clicks **"Sync TFT17 Data"**.
3. A Next.js Server Action (or API route) spawns `download-riot-data.mjs` as a child process with the `TFT17_` prefix setting passed as an environment variable or CLI arg.
4. stdout/stderr from the script streams back to the UI via Server-Sent Events or a polling endpoint.
5. On completion, a sync job record (timestamp, status, counts) is written to the `sync_jobs` Supabase table.
6. Admin sees a success/failure banner with the counts (champions, traits, augments, items).

### Flow 2: Augment Tier Editing
1. Admin navigates to `/admin/augments`.
2. The page fetches all augments from the Supabase `augments` table (populated by the sync script).
3. Admin clicks a tier badge or tag chip on any row — an inline select or popover appears.
4. Admin selects the new value; the change is saved immediately via a Server Action to Supabase.
5. The row updates optimistically in the UI without a full page reload.

### Flow 3: Champion Trait Assignment
1. Admin navigates to `/admin/champions`.
2. The page loads all champions from the Supabase `champions` table (populated by the sync script), alongside all available traits from the `traits` table.
3. Each champion row shows their name, cost, and current assigned traits as removable chips.
4. Admin clicks a champion row to expand an inline trait editor — a multi-select dropdown populated from the current set's `traits` table.
5. Admin adds or removes traits; clicking **Save** triggers a Server Action that:
   a. Updates the `champion_traits` join table in Supabase.
   b. Writes the updated `lib/champion-traits.json` file on the server (so the next sync script run picks up the correct assignments).
6. The champion row updates optimistically to show the new trait chips.

### Flow 4: Insight Submission & Moderation
1. Any authenticated user navigates to the Insights section (public page, e.g. `/insights`).
2. User clicks **"Write Insight"**, fills in a title and body (plain text / markdown), and submits.
3. The post is saved to the `insights` table with `status: 'pending'`.
4. Admin/Moderator navigates to `/admin/insights`.
5. They see a queue of pending posts with preview.
6. They click **Approve** or **Reject**; the `status` field updates accordingly in Supabase.
7. Approved posts appear on the public `/insights` feed. Rejected posts are hidden.

### Flow 5: Role Promotion / User Management
1. Admin navigates to `/admin/users`.
2. The page lists all users from `auth.users` joined with a `profiles` table (which holds `role`).
3. Admin clicks a role badge on a user row and selects a new role from a dropdown.
4. A Server Action updates the `profiles.role` column in Supabase.
5. The affected user's next request reflects their new role.

### Flow 6: Admin Login
1. Admin navigates to `/login`.
2. Enters email and password and submits the form.
3. Supabase Auth validates credentials and sets a session cookie.
4. Middleware detects the valid session and `admin` role on the next request.
5. Admin is redirected to `/admin`.

## Constraints and Assumptions

- **Auth**: Supabase Auth (email/password for MVP; magic link deferred). A `/login` page is the auth entry point. Role is stored in a `profiles` table (`role: 'admin' | 'moderator' | 'user'`). The `/admin/*` routes are protected via middleware that checks the role from the Supabase session. The first admin account is seeded manually via Supabase Studio — no sign-up UI is built for admins.
- **Database**: Supabase (PostgreSQL). Key tables needed: `profiles`, `champions`, `traits`, `champion_traits` (join table), `augments`, `insights`, `sync_jobs`. The sync script must upsert into `champions`, `traits`, and `augments` on each run. **Migration path:** The first TFT17 sync seeds `augments.tier` from `lib/augment-tiers.json`; after that, Supabase is the source of truth and admin inline edits are authoritative. `lib/augment-tiers.json` is preserved as a local dev fallback only.
- **Sync script execution**: The script runs as a Node.js child process spawned from a Next.js API route / Server Action. It can only run on the server (not in a browser). It requires the `DDRAGON_VERSION` constant (currently `16.7.1`) to be parameterized so it can be changed without code edits — pass it as an env var `DDRAGON_VERSION=17.x.x` or a CLI argument.
- **TFT17 naming**: The sync script filters entities by the prefix `TFT16_`. This must be updated to `TFT17_` (or made configurable). This is a prerequisite for any TFT17 data to appear.
- **No subscription gating for MVP**: User roles are `admin`, `moderator`, and `user`. No payment or subscription integration.
- **Insight posts scope for MVP**: Submission is restricted to admin and moderator roles. Public user sign-up and open community submission is a Phase 2 concern — no public sign-up route is built in this feature.
- **Stack**: Next.js (App Router), TypeScript, Supabase (Auth + PostgreSQL), Tailwind CSS.
- **No existing API routes for admin operations today** — all mutations must be built as Server Actions or new API routes.

## Success Criteria

- An admin can log in at `/login` via email/password and is redirected to `/admin` on success.
- `/admin/*` routes are inaccessible to unauthenticated users and non-admin roles; unauthorized access redirects to `/` or a 403 page.
- An admin can trigger a TFT17 data sync from the dashboard; the UI streams real-time log output and records the job result (including counts) in Supabase.
- A failed sync job writes `status: 'error'` to the `sync_jobs` row and the full partial log output is preserved in `log_output`.
- All augment tiers and tags are editable inline from the admin UI and immediately reflected in the Supabase `augments` table.
- All champion trait assignments are editable inline from the admin UI; changes are persisted to Supabase and written back to `lib/champion-traits.json`.
- An admin or moderator can submit an Insight post; it is not publicly visible until approved.
- An admin can change any user's role; the change takes effect on the user's next request.
- The top-level admin dashboard displays the last sync timestamp, current DDragon data version, and recent sync job history.

## Open Questions

1. **DDragon version parameterization** ✅ *Resolved — see design §10*: Admin inputs the version string in the Sync UI. Validated as semver format. Stored with the sync job record.
2. **Sync script output streaming** ✅ *Resolved — see design §10*: Server-Sent Events (SSE) via `/api/admin/sync/stream`. Simple, unidirectional, HTTP/2 compatible.
3. **Moderator role scope** ✅ *Resolved — see design §10*: Moderators can ONLY access `/admin/insights`. Augment and champion management is admin-only.
4. **Champion trait source of truth** ✅ *Resolved — see design §10*: Supabase `champion_traits` is the primary source. `lib/champion-traits.json` is regenerated on each admin save as a compatibility layer.
5. **Trait assignment multi-select UX** ✅ *Resolved — see design §10*: Inline expandable row with a searchable `InlineMultiSelect`. No modal for MVP.
6. **Insight content format** ✅ *Resolved — see design §10*: Markdown body stored as plain text, rendered with `react-markdown` on the reading view.
7. **Public Insights page** ✅ *Resolved — see design §10*: `/insights`, `/insights/[id]`, and `/insights/new` are all in scope.
8. **Supabase RLS** ✅ *Resolved — see design §10*: Deferred to post-MVP. Server-side role checks only for now.
9. **Data pipeline (Riot Match API)** ✅ *Resolved*: Only the DDragon static sync (Layer 1) is admin-triggerable for MVP. The Riot Match ingestion pipeline (Layers 2–4) is a future feature documented in design §11 for reference.
