'use client';

import React, { useState } from 'react';
import { getChampionImageUrl } from '@/lib/riot-cdn';

export interface ChampionAvatarProps {
  id?: string;
  name: string;
  icon?: string;
  className?: string;
  shape?: 'circle' | 'hexagon';
}

export function getCDragonUrl(character_id: string): string {
  const norm = character_id.toLowerCase();
  return `https://raw.communitydragon.org/latest/game/assets/characters/${norm}/hud/${norm}_square.tft_set16.png`;
}

export function ChampionAvatar({ id, name, icon, className = "", shape = 'circle' }: ChampionAvatarProps) {
  const [imgState, setImgState] = useState<'primary' | 'secondary' | 'fallback' | 'error'>('primary');

  const clipPath = shape === 'hexagon' ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' : undefined;
  const roundedClass = shape === 'circle' ? 'rounded-full' : '';

  const containerClasses = `overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#1e1e24] ${roundedClass} ${className} relative`;
  const defaultSize = className.includes('w-') ? {} : { width: '48px', height: '48px' };

  const assumedId = id || (name.startsWith('TFT16_') ? name : `TFT16_${name.replace(/[^a-zA-Z]/g, '')}`);
  const cdragonUrl = getCDragonUrl(assumedId);
  const ddragonUrl = icon ? getChampionImageUrl(icon) : '';
  const fallbackUrl = `/images/placeholder.png`;

  return (
    <div className={containerClasses} style={{ ...defaultSize, clipPath }} title={name}>
      {imgState === 'primary' && (
        <img 
          src={cdragonUrl} 
          alt={name}
          className="w-full h-full object-cover object-center absolute pointer-events-none" 
          onError={() => setImgState(ddragonUrl ? 'secondary' : 'fallback')} 
          loading="lazy"
          crossOrigin="anonymous"
        />
      )}
      {imgState === 'secondary' && ddragonUrl && (
        <img 
          src={ddragonUrl} 
          alt={name}
          className="w-full h-full object-cover object-center absolute pointer-events-none" 
          onError={() => setImgState('fallback')} 
          loading="lazy"
          crossOrigin="anonymous"
        />
      )}
      {imgState === 'fallback' && (
        <img src={fallbackUrl} alt="Fallback" className="w-full h-full object-cover pointer-events-none opacity-50" />
      )}
      {imgState === 'error' && (
        <div className="w-full h-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">{name.slice(0,3)}</div>
      )}
    </div>
  );
}

export function HexagonFrame({ children, color, bg = '#000', size = 52, padding = 2, className = '' }: 
{ children: React.ReactNode, color: string, bg?: string, size?: number, padding?: number, className?: string }) {
  const clip = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
  const w = size * 0.92;
  return (
    <div className={`flex items-center justify-center ${className}`} 
         style={{ width: `${w}px`, height: `${size}px`, backgroundColor: color, clipPath: clip }}>
      <div className="flex items-center justify-center"
           style={{ width: `${w - padding * 2}px`, height: `${size - padding * 2}px`, backgroundColor: bg, clipPath: clip }}>
        {children}
      </div>
    </div>
  );
}
