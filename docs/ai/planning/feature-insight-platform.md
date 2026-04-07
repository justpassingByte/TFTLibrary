---
title: Insight Platform Planning
type: planning
status: draft
---

# Implementation Plan: Insight Platform

## Task Breakdown

### Phase 1: Study Hall Baseline Refactor
- [ ] Extract the hard-coded `GUIDES` data from `app/studyhall/page.tsx` into a typed content module.
- [ ] Split the Study Hall feed into reusable presentational components while preserving the current visual style and route.
- [ ] Make card actions and category filters data-driven so they can point to real article content.

### Phase 2: Reader Experience MVP
- [ ] Implement a public article route under the existing Study Hall IA, such as `app/studyhall/[slug]/page.tsx`.
- [ ] Define a lightweight article schema for metadata, tags, read time, and ordered content blocks.
- [ ] Build a `BlockRenderer` or equivalent typed renderer for the MVP content blocks.

### Phase 3: Content Authoring Foundation
- [ ] Decide the initial source of truth for articles: local content files, Markdown, or a lightweight CMS.
- [ ] Add validation and loading utilities so content can be rendered safely in App Router pages.
- [ ] Document how maintainers add or update Study Hall articles without changing page layout code.

### Phase 4: Submission Workflow (Future-Gated)
- [ ] Select auth and persistence strategy before any creator-facing drafting flow is built.
- [ ] Design post lifecycle transitions (`draft -> pending -> published`) only after the storage model is chosen.
- [ ] Revisit image upload or builder/tierlist asset ingestion once the export behavior exists in the product.

### Phase 5: Moderation and Scale
- [ ] Build admin moderation routes only after post persistence and auth are in place.
- [ ] Add upload infrastructure only when article media cannot be served from the chosen content source.
- [ ] Reassess whether a separate `/insight` namespace is needed after the Study Hall MVP is live and validated.

## Implementation Order
Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5

## Dependencies
- Article content format must be chosen before Phase 2 is finalized.
- Auth, persistence, and moderation dependencies are not blockers for the Study Hall MVP, but they are blockers for Phases 4 and 5.

## Risk Mitigation
- **Scope Creep**: Do not treat the current frontend-only repo as if it already has backend infrastructure.
- **IA Drift**: Reuse the existing `/studyhall` route until there is an explicit product decision to rename or split it.
- **Editor Complexity**: If authoring is added later, keep the first block model limited and avoid nested rich-text behavior.
