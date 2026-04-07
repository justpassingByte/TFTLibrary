'use client';

import React, { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { updateChampionIcon } from './actions';

export function AvatarEditor({
  champion,
  onSaveDone,
  onCancel,
}: {
  champion: { id: string, name: string, icon: string | null };
  onSaveDone: () => void;
  onCancel: () => void;
}) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const [localImage, setLocalImage] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  // Icon from DB is always a full HTTPS URL (CDragon or Supabase)
  const imageUrl = champion.icon || '';

  const supabase = createClient();

  const currentSrc = localImage 
    ? localImage 
    : (hasError ? '/images/placeholder.png' : imageUrl);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - x, y: e.clientY - y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setX(e.clientX - dragStart.x);
    setY(e.clientY - dragStart.y);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((prev) => Math.min(Math.max(0.5, prev - e.deltaY * 0.001), 3));
  };

  const save = async () => {
    if (!imgRef.current) return;
    setSaving(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 128; // fixed export size
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const FRAME_SIZE = 80;
      const scaleFactor = 128 / FRAME_SIZE;
      
      ctx.clearRect(0, 0, 128, 128);

      const nw = imgRef.current.naturalWidth;
      const nh = imgRef.current.naturalHeight;
      const imageScale = Math.max(FRAME_SIZE / nw, FRAME_SIZE / nh);
      const dw = nw * imageScale;
      const dh = nh * imageScale;
      
      ctx.scale(scaleFactor, scaleFactor);
      
      // Move to center of frame
      ctx.translate(FRAME_SIZE / 2, FRAME_SIZE / 2);
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      
      // Draw image centered
      ctx.drawImage(imgRef.current, -dw / 2, -dh / 2, dw, dh);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setSaving(false);
          return;
        }

        try {
          const fileExt = 'png';
          // Use fixed path based on id to prevent unlimited storage bloat
          const fileName = `champs/${champion.id}-avatar-v${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, blob, { contentType: 'image/png', upsert: true });

          if (uploadError) throw uploadError;

          const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(fileName);
          
          // Save back to DB — overwrites the CDragon URL with Supabase URL
          await updateChampionIcon(champion.id, publicData.publicUrl);
          
          onSaveDone();
        } catch (uploadErr) {
          console.error('Supabase upload error:', uploadErr);
          alert('Failed to save to Supabase. Check bucket settings.');
        } finally {
          setSaving(false);
        }
      }, 'image/png');
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div 
         className="editor-frame bg-[#1e1e24]"
         style={{
           width: 80, height: 80, overflow: 'hidden', borderRadius: '50%',
           position: 'relative', border: '2px dashed #EB5E28',
           touchAction: 'none'
         }}
         onWheel={handleWheel}
      >
        <img 
          ref={imgRef}
          src={currentSrc}
          onError={() => {
            if (localImage) return; // Ignore errors if it's local
            setHasError(true);
          }}
          alt={`Avatar preview for ${champion.name}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          draggable={false}
          style={{
             position: 'absolute',
             top: '50%',
             left: '50%',
             width: '100%',
             height: '100%',
             objectFit: 'cover',
             transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale})`,
             cursor: isDragging ? 'grabbing' : 'grab',
             userSelect: 'none',
          }}
          crossOrigin="anonymous"
        />
      </div>

      <div className="mt-6 flex items-center justify-between w-full">
         <span className="text-[10px] text-gray-500 font-bold uppercase mr-2">Zoom</span>
         <input 
            type="range" min={0.5} max={3} step={0.01} 
            value={scale} onChange={e => setScale(parseFloat(e.target.value))} 
            className="flex-1 accent-[#EB5E28]"
         />
      </div>

      <div className="mt-4 flex justify-center w-full">
         <label className="cursor-pointer px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 hover:bg-gray-100 uppercase tracking-widest transition-colors">
           Upload Custom Image
           <input type="file" className="hidden" accept="image/*" onChange={(e) => {
             const file = e.target.files?.[0];
             if (file) {
               setLocalImage(URL.createObjectURL(file));
               setX(0); setY(0); setScale(1);
             }
           }} />
         </label>
      </div>

      <div className="mt-4 flex justify-between gap-3 w-full">
         <button onClick={onCancel} disabled={saving} className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 uppercase tracking-wide">
           Cancel
         </button>
         <button onClick={save} disabled={saving} className="flex-1 py-2 text-xs font-bold text-white bg-[#EB5E28] rounded-lg hover:bg-[#D54A18] disabled:opacity-50 uppercase tracking-wide transition-colors">
           {saving ? 'Saving...' : 'Save Avatar'}
         </button>
      </div>
    </div>
  )
}
