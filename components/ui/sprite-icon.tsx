import React from 'react';
import {
  getChampionImageUrl,
  getAugmentImageUrl,
  getItemImageUrl,
  getTraitImageUrl,
} from '@/lib/riot-cdn';

interface SpriteIconProps {
  type: 'champion' | 'item' | 'augment' | 'trait';
  id: string;
  className?: string;
  alt?: string;
  scale?: number;
}

export function SpriteIcon({ type, id, className = '', alt, scale = 1 }: SpriteIconProps) {
  if (!id) return <div className={`inline-block ${className}`} />;

  let imageUrl = '';
  switch (type) {
    case 'champion': imageUrl = getChampionImageUrl(id); break;
    case 'augment': imageUrl = getAugmentImageUrl(id); break;
    case 'item': imageUrl = getItemImageUrl(id); break;
    case 'trait': imageUrl = getTraitImageUrl(id); break;
  }

  if (!imageUrl) {
    return (
      <div className={`inline-block bg-white/5 flex text-[8px] items-center justify-center ${className}`} title={alt || id}>
        {(alt || id).slice(0, 3)}
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`} title={alt || id}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={alt || id}
        className="object-contain"
        style={{
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          width: '100%',
          height: '100%',
        }}
        loading="lazy"
      />
    </div>
  );
}
