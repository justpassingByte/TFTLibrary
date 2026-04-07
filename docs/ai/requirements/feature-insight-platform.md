---
title: Insight Platform
type: requirement
status: draft
---

# Feature: Insight Platform

## Problem Statement
`/studyhall` currently exists as a static "The Archives" landing page with hard-coded guide cards, but users cannot open a real article, creators cannot publish strategy writeups, and admins have no moderation workflow. The product needs a content system that turns Study Hall into a real long-form learning surface first, while leaving a clear path toward creator submissions, embedded comp or tierlist visuals, and moderation later.

## Target Audience
- TFT Players & Creators (content creators, high Elo players)
- General Community (readers looking for strategies, patches, guides)
- Admins (moderators of content)

## Current Product Baseline
- `app/studyhall/page.tsx` is a static feed with local guide metadata and non-functional category buttons.
- The home page already promotes Study Hall as a core feature and links to `/studyhall`.
- `app/builder/page.tsx` and `app/tierlist-maker/page.tsx` expose "Share" CTA buttons, but there is no implemented export, upload, or publishing pipeline behind them.
- The repo currently has no auth provider, database layer, upload service, or App Router route handlers for posts.

## Goals
- Turn Study Hall into a real reading experience backed by structured content instead of a hard-coded card array.
- Preserve the current `/studyhall` information architecture and visual identity while expanding it into article detail views.
- Define a lightweight article content model that supports text, lists, highlight callouts, and embedded images.
- Support content tagging and metadata that match the current card-based browsing experience.
- Leave a clean extension path for future creator submissions, draft states, and moderation once infrastructure exists.

## Non-Goals
- Renaming the public surface away from Study Hall or replacing it with a parallel `/insight` IA in the first release.
- Real-time collaborative editing.
- A full Notion or Medium clone with complex rich text, nested layouts, or rich embeds in the first pass.
- Requiring auth, storage, or moderation infrastructure before the public reading experience exists.

## User Stories
1. **As a reader**, I can browse `/studyhall`, filter by topic, and open a full strategy article from the feed.
2. **As a reader**, I can consume a long-form post that includes clear metadata, readable sections, and supporting visuals.
3. **As a maintainer**, I can add or update Study Hall content through a structured format without rewriting page layout code.
4. **As a creator or admin**, I have a defined future path for draft, review, and publish states once auth and persistence are introduced.
5. **As a player**, I can eventually connect comp-builder or tierlist outputs to supporting written analysis when export support is real.

## Critical Flows
1. Reader lands on `/studyhall`, scans tagged cards, and opens a detailed guide.
2. Reader consumes a full guide page with article metadata, block-based sections, and embedded visual assets.
3. Future workflow: author creates or edits a draft, submits it for review, and an admin publishes it to the Study Hall feed.

## Constraints and Assumptions
- The current stack is a Next.js App Router frontend using React 19, Tailwind 4, and Framer Motion.
- There is no existing auth, ORM, database schema, or upload endpoint in the repo today.
- The first delivery should reuse `app/studyhall/page.tsx` instead of introducing a second public content route.
- Builder and tierlist flows currently suggest sharing behavior in the UI, but the underlying export mechanism still needs to be defined.

## Success Criteria
- Study Hall is driven by structured content rather than a hard-coded list of cards in `app/studyhall/page.tsx`.
- Readers can open at least one real article detail page from the Study Hall feed.
- Article rendering supports the agreed MVP blocks and metadata without breaking the existing visual language.
- The doc set clearly separates the MVP reading experience from later authoring, submission, and moderation phases.

## Open Questions
- Should the first content source be local TypeScript or JSON, Markdown, or a lightweight CMS?
- Should public article URLs live under `/studyhall/[slug]`, or is a future `/insight` rename intentional?
- Is the first release admin-authored only, or should creator submissions be part of the initial scope?
- When sharing from Builder or Tierlist Maker becomes real, what artifact format should the article system ingest?
