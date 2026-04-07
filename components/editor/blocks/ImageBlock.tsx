'use client';

import { useRef, useState } from 'react';
import { ImageIcon, X } from 'lucide-react';
import type { Block, ImageContent } from '@/lib/editor/types';

interface Props {
  block: Block;
  onUpdate: (content: ImageContent) => void;
  onFocus: () => void;
}

export function ImageBlock({ block, onUpdate, onFocus }: Props) {
  const content = block.content as ImageContent;
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    onUpdate({ ...content, url, alt: file.name });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  if (content.url) {
    return (
      <div className="image-block-wrapper" onClick={onFocus}>
        <div className="image-block-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={content.url} alt={content.alt ?? 'Block image'} className="image-block-img" />
          <button
            className="image-block-remove"
            onClick={(e) => { e.stopPropagation(); onUpdate({ url: '', alt: '' }); }}
            title="Remove image"
          >
            <X size={14} />
          </button>
        </div>
        <input
          type="text"
          value={content.caption ?? ''}
          placeholder="Add a caption…"
          className="image-block-caption"
          onChange={(e) => onUpdate({ ...content, caption: e.target.value })}
        />
      </div>
    );
  }

  return (
    <div
      className={`image-block-upload ${dragging ? 'image-block-upload--drag' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onClick={() => inputRef.current?.click()}
    >
      <ImageIcon size={28} className="image-block-icon" />
      <p className="image-block-hint">Drop an image or click to upload</p>
      <p className="image-block-sub">Supports PNG, JPG, GIF, WebP</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
