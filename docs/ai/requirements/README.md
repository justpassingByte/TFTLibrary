# Requirements Template

Use this template for `docs/ai/requirements/feature-{name}.md`.

## Frontmatter

```md
---
title: <Feature Name>
type: requirement
status: draft
---
```

## Required Sections

```md
# Feature: <Feature Name>

## Problem Statement
What is broken or missing today? Reference the current product baseline and who feels the pain.

## Target Audience
- Primary audience
- Secondary audience

## Current Product Baseline
Describe the routes, components, or workflows that already exist in the codebase today.

## Goals
- Outcome-focused goals for the first meaningful release.

## Non-Goals
- Explicitly out-of-scope work to prevent design drift.

## User Stories
1. As a <user>, I can ...

## Critical Flows
1. End-to-end flow for the highest-value user path.

## Constraints and Assumptions
- Current stack constraints
- Data/auth/storage assumptions
- Dependencies on existing routes or components

## Success Criteria
- Observable outcomes that define a successful release.

## Open Questions
- Decisions that still need product or technical input.
```

## Writing Rules

- Anchor the requirement in the current codebase before describing future-state behavior.
- Reuse existing route names and information architecture unless a rename is intentional.
- Separate MVP goals from later-phase platform ambitions such as moderation, collaboration, or CMS features.
- Call out missing infrastructure explicitly when the repo does not yet have auth, persistence, uploads, or APIs.
- Keep success criteria measurable from a user or product perspective.
