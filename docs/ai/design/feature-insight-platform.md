---
title: Insight Platform Design
type: design
status: draft
---

# Insight Platform Design Document

## 1. Architecture Overview
The Insight Platform will be built inside the existing Next.js App Router workspace (`app/studyhall` can serve as inspiration/foundation). We will use a component-based architecture extending the current UI setup. State management for the editor will be handled locally, serializing to a generic JSON format before sending to the backend. 

## 2. Database Schema
Assuming a relational DB (PostgreSQL) via ORM (Prisma/Drizzle), the core schema includes:

```sql
CREATE TYPE PostStatus AS ENUM ('draft', 'pending', 'published', 'rejected');

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content_blocks JSONB NOT NULL DEFAULT '[]', -- The core content payload
  cover_image VARCHAR(255),
  author_id UUID REFERENCES users(id),       -- Assuming users table exists
  status PostStatus DEFAULT 'draft',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 3. Post API Design (Next.js App Router Route Handlers or Server Actions)

- **`POST /api/posts`**
  - **Body**: `{ title, content_blocks, cover_image, tags }`
  - **Returns**: Created Draft Post.
- **`PUT /api/posts/:id`**
  - **Body**: Updates to post fields (auto-save drafts).
- **`POST /api/posts/:id/submit`**
  - **Action**: Changes status from `draft` -> `pending`.
- **`POST /api/admin/posts/:id/approve`**
  - **Role**: Admin only.
  - **Action**: Changes status from `pending` -> `published`.
- **`POST /api/upload`**
  - **Body**: Multipart form data (Image file).
  - **Returns**: `{ url: "...", metadata: {...} }`

## 4. Editor Component Structure
Editor uses a custom minimal implementation to avoid bloated dependencies. Content is an array of block objects.

```typescript
type BlockType = 'h1' | 'h2' | 'paragraph' | 'image' | 'list' | 'highlight';

interface Block {
  id: string;
  type: BlockType;
  content: string | string[]; // Array for lists, string for text/image URL
  metadata?: any; 
}

// React Components
<InsightEditor>
   <EditorToolbar />
   <EditorCanvas blocks={blocks} onChange={setBlocks} />
   <SubmitPanel onSaveDraft={...} onSubmit={...} />
</InsightEditor>

<BlockRenderer block={block} /> // Dynamically imports based on BlockType
```

## 5. Basic UI Layout

### `app/insight/[id]/page.tsx` (Public Reading View)
- **Header**: Large Cover Image, Title overlay, Author Avatar + Name, Date, Tags.
- **Body**: Max-width container (`max-w-3xl`) for optimal reading width. Sequential iteration mapping `content_blocks` to highly-styled display components.
- **Sidebar (Optional/Desktop)**: Related Posts / Table of Contents.

### `app/insight/editor/page.tsx` (Writing View)
- Clean, Notion-like UI. 
- "/"-command or floating toolbar to select block types.
- Auto-saving indicator.

### `app/admin/moderation/page.tsx`
- Dashboard table listing `status === 'pending'` posts.
- Preview button.
- Approve/Reject actions. 
