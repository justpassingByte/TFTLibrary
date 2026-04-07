import React, { useState } from 'react';
import Image from 'next/image';
import {
  getChampionImageUrl,
  getAugmentImageUrl,
  getItemImageUrl,
  getTraitImageUrl,
} from '@/lib/riot-cdn';

export interface GameIconProps {
  type: 'champion' | 'item' | 'augment' | 'trait';
  id?: string; // Kept for fallback text if icon fails
  icon?: string | null;
  className?: string;
  alt?: string;
  scale?: number;
  style?: React.CSSProperties;
}

export function GameIcon({ type, id, icon, className = '', alt, scale = 1, style }: GameIconProps) {
  const [error, setError] = useState(false);
  
  if (!icon || error) {
    return (
      <div className={`inline-flex bg-white/10 text-[10px] items-center justify-center font-bold px-1 ${className.replace(/w-\d+ h-\d+|w-full h-full/g, '')} min-h-[16px] min-w-[20px] rounded shadow-sm text-white`} title={alt || id || ''}>
        {(alt || id || '').slice(0, 3)}
      </div>
    );
  }

  let finalIcon = icon;
  if (!icon.startsWith('http')) {
    switch (type) {
      case 'champion': finalIcon = getChampionImageUrl(icon); break;
      case 'augment': finalIcon = getAugmentImageUrl(icon); break;
      case 'item': finalIcon = getItemImageUrl(icon); break;
      case 'trait': finalIcon = getTraitImageUrl(icon); break;
    }
  }

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`} style={{ ...style, transform: scale !== 1 ? `scale(${scale})` : undefined }} title={alt || id}>
      <Image
        src={finalIcon}
        alt={alt || id || ''}
        fill
        sizes="50vw"
        className="object-contain"
        unoptimized={true}
        onError={() => setError(true)}
      />
    </div>
  );
}
