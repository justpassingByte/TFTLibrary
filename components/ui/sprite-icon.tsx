import React, { useState } from 'react';
import Image from 'next/image';
import {
  getChampionImageUrl,
  getAugmentImageUrl,
  getItemImageUrl,
  getTraitImageUrl,
} from '@/lib/riot-cdn';

export interface SpriteIconProps {
  type: 'champion' | 'item' | 'augment' | 'trait';
  id?: string; // Kept for fallback text if icon fails
  icon?: string | null;
  className?: string;
  alt?: string;
  scale?: number;
  style?: React.CSSProperties;
}

export function SpriteIcon({ type, id, icon, className = '', alt, scale = 1, style }: SpriteIconProps) {
  const [error, setError] = useState(false);
  
  if (!icon) {
    return (
      <div className={`inline-flex bg-white/10 text-[10px] items-center justify-center font-bold px-1 ${className.replace(/w-\d+ h-\d+|w-full h-full/g, '')} min-h-[16px] min-w-[20px] rounded shadow-sm text-white`} title={alt || id || ''}>
        {(alt || id || '').slice(0, 3)}
      </div>
    );
  }

  let imageUrl = '';
  switch (type) {
    case 'champion': imageUrl = getChampionImageUrl(icon); break;
    case 'augment': imageUrl = getAugmentImageUrl(icon); break;
    case 'item': imageUrl = getItemImageUrl(icon); break;
    case 'trait': imageUrl = getTraitImageUrl(icon); break;
  }

  if (!imageUrl || error) {
    return (
      <div className={`inline-flex bg-white/10 text-[10px] items-center justify-center font-bold px-1 ${className.replace(/w-\d+ h-\d+|w-full h-full/g, '')} min-h-[16px] min-w-[20px] rounded shadow-sm text-white`} title={alt || id || ''}>
        {(alt || id || '').slice(0, 3)}
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`} style={{ ...style, transform: scale !== 1 ? `scale(${scale})` : undefined }} title={alt || id}>
      <Image
        src={imageUrl}
        alt={alt || id || ''}
        fill
        sizes="50vw"
        className="object-contain"
        crossOrigin="anonymous"
        unoptimized={true}
        onError={() => setError(true)}
      />
    </div>
  );
}
