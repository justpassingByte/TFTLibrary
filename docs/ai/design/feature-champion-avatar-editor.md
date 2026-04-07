---
title: Champion Avatar Editor
type: design
status: draft
---

# Design: Champion Avatar Editor

## Architecture Overview
The functionality will be an inline component in the Admin Champions dashboard, avoiding full-page navigations. Processing is done client-side using HTML5 Canvas to perform the crop/transform, followed by an API call / Supabase direct upload to save the finalized image and update the champion record.

## Data Models
**Champion Table (Supabase)**
- `avatar_url`: Will be overridden with the new Supabase Storage URL.
- (Optional) `avatar_adjustment`: JSON column to store `{x, y, scale}` for future non-destructive re-adjustments.

## APIs and Interfaces
1. **Supabase Storage Upload**: `supabase.storage.from('avatars').upload(...)` to upload the newly generated canvas blob.
2. **Server Action / API Route (`app/admin/champions/actions.ts`)**: To update the `champions` row with the new `avatar_url`.

## Components
**AvatarEditor (`app/admin/champions/components/AvatarEditor.tsx`)**
- Props: `initialImage: string`, `onSave: (file: Blob, adjustment: {x, y, scale}) => Promise<void>`, `onCancel: () => void`.
- **State**:
    - `x` (number): translateX value.
    - `y` (number): translateY value.
    - `scale` (number): scale value.
    - `isDragging` (boolean).
- **DOM Structure**:
    ```html
    <div className="avatar-editor">
      <div className="frame" style={{ width: 80, height: 80, overflow: 'hidden', borderRadius: '50%', position: 'relative' }}>
         <img src={...} style={{ position: 'absolute', transform: `translate(${x}px, ${y}px) scale(${scale})`, cursor: 'grab', userSelect: 'none' }} />
      </div>
      ...Controls (Zoom Slider, Save Button)...
    </div>
    ```
- **Interactions**:
    - `onPointerDown`/`onPointerMove`/`onPointerUp` to mutate `x` and `y`.
    - `onWheel` or `input type="range"` to mutate `scale`.

## Canvas Generation Logic
When the user clicks "Save", the component will render the transformed image onto an offscreen canvas:
1. Create Canvas (128x128).
2. Get 2D Context.
3. `ctx.setTransform(scale, 0, 0, scale, x, y)`.
4. `ctx.drawImage(image, 0, 0)`.
5. Convert to Blob: `canvas.toBlob((blob) => { ... }, 'image/png')`.

## Security & Performance
- **Performance**: Use pure React state or Refs for tracking position. Avoid complex 3rd party crop libs.
- **Security**: Must validate admin roles for both the storage upload and the database update.
