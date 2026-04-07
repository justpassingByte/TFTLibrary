---
title: Champion Avatar Editor
type: requirement
status: draft
---

# Feature: Champion Avatar Editor

## Problem Statement
Administrators need to quickly adjust champion avatars which are often off-centered, incorrectly scaled, or improperly cropped from game assets. Currently, adjusting these requires an external image editor or complex tools. The process needs to be fast and simple to allow for bulk editing directly from the admin dashboard.

## Target Audience
- Primary audience: System Administrators / Content Managers

## Current Product Baseline
The current application displays a grid of champion avatars in the admin dashboard (e.g., `/app/admin/champions/page.tsx` and `ChampionsPageClient`). Avatars are displayed but there is no inline editing interface.

## Goals
- Allow admin to click an avatar and enter "edit mode".
- Provide an intuitive GUI to drag (reposition) and zoom (scale) the image within a fixed circular frame.
- Allow fast saving which processes the edits and uploads the cropped version to Supabase.

## Non-Goals
- Complex image editing (filters, color correction).
- Free-form cropping (the crop is always a fixed square/circle).

## User Stories
1. As an admin, I can click a champion avatar in the grid to open the Avatar Editor.
2. As an admin, I can drag the uncropped image inside a fixed frame to adjust its center point.
3. As an admin, I can use my mouse wheel or a slider to zoom the image in and out within the frame.
4. As an admin, I can click "Save" to automatically generate a correctly cropped 128x128 PNG image, which gets uploaded to Supabase replacing the original avatar.

## Critical Flows
1. Admin user selects Champion Avatar -> Avatar enters "Edit Mode" with a fixed frame -> Admin drags/scales image -> Admin clicks "Save" -> Image drawn to Canvas -> Exported to PNG -> Uploaded to Supabase Storage -> Avatar URL updated in database.

## Constraints and Assumptions
- The output frame must be square/circular and scale consistently.
- Must not use heavy third-party crop libraries; native DOM dragging and Canvas API should be used for performance and simplicity.
- The exported image should preferably be a 128x128 or optimally sized PNG.

## Success Criteria
- Editing an avatar takes less than 5 seconds.
- The UI interaction (drag/zoom) remains fluid.
- The saved avatar perfectly reflects the preview in the admin interface.

## Open Questions
- Do we need to store the `x`, `y`, and `scale` values in the database, or is storing the final cropped `avatar_url` sufficient? (User mentioned optional storage of transforms).
