'use client';

import React, { useState } from 'react';

export interface ChampionAvatarProps {
  id?: string;
  name: string;
  icon?: string;
  className?: string;
  shape?: 'circle' | 'hexagon';
}

export function ChampionAvatar({ id, name, icon, className = "", shape = 'circle' }: ChampionAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const clipPath = shape === 'hexagon' ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' : undefined;
  const roundedClass = shape === 'circle' ? 'rounded-full' : '';

  const containerClasses = `overflow-hidden flex-shrink-0 flex items-center justify-center bg-[#1e1e24] ${roundedClass} ${className} relative`;
  const defaultSize = className.includes('w-') ? {} : { width: '48px', height: '48px' };

  // Icon from DB is always a full HTTPS URL (CDragon or Supabase)
  const imageUrl = icon || '';

  return (
    <div className={containerClasses} style={{ ...defaultSize, clipPath }} title={name}>
      {!hasError && imageUrl ? (
        <img 
          src={imageUrl} 
          alt={name}
          className="w-full h-full object-cover object-center absolute pointer-events-none scale-[1.12]" 
          onError={() => setHasError(true)} 
          loading="lazy"
          crossOrigin="anonymous"
        />
      ) : (
        <div className="w-full h-full bg-[#1e1e24] text-white/50 flex items-center justify-center font-bold text-xs">
          {name.slice(0, 2)}
        </div>
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
