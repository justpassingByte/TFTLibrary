'use client';

import React, { useState } from 'react';
import { DDRAGON_VERSION } from '@/lib/riot-cdn';
import { GENERATED_CHAMPIONS } from '@/lib/generated-data';

interface ChampionAvatarProps {
  name: string;
  className?: string;
  shape?: 'circle' | 'hexagon';
}

export function getChampionName(character_id: string): string {
  if (!character_id.startsWith('TFT16_')) return '';
  return character_id.toLowerCase();
}

export function getCDragonUrl(normalizedName: string): string {
  return `https://raw.communitydragon.org/latest/game/assets/characters/${normalizedName}/hud/${normalizedName}_square.tft_set16.png`;
}

export function ChampionAvatar({ name, className = "", shape = 'circle' }: ChampionAvatarProps) {
  const [imgState, setImgState] = useState<'primary' | 'sprite' | 'fallback'>('primary');

  const clipPath = shape === 'hexagon' ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' : undefined;
  const roundedClass = shape === 'circle' ? 'rounded-full' : '';

  const champ = GENERATED_CHAMPIONS.find(c => c.name === name || c.id === name);
  const character_id = champ?.id || name;

  const containerClasses = `overflow-hidden flex-shrink-0 flex items-center justify-center bg-black ${roundedClass} ${className}`;
  const defaultSize = className.includes('w-') ? {} : { width: '48px', height: '48px' };

  if (!character_id.startsWith('TFT16_')) {
    return (
      <div className={containerClasses} style={{ ...defaultSize, clipPath }}>
        <img src="/images/placeholder.png" alt="Fallback" className="w-full h-full object-cover" />
      </div>
    );
  }

  const normalizedName = getChampionName(character_id);
  const primaryUrl = getCDragonUrl(normalizedName);

  const renderSprite = () => {
    if (!champ || !champ.image || !champ.image.sprite) {
      if (imgState !== 'fallback') {
        setTimeout(() => setImgState('fallback'), 0);
      }
      return null;
    }
    const { sprite, x, y, w, h } = champ.image;
    const spriteUrl = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/sprite/${sprite}`;

    return (
      <div
        style={{
          width: w,
          height: h,
          backgroundImage: `url(${spriteUrl})`,
          backgroundPosition: `-${x}px -${y}px`,
          backgroundRepeat: 'no-repeat',
        }}
        title={champ.name}
      />
    );
  };

  return (
    <div className={containerClasses} style={{ ...defaultSize, clipPath }}>
      {imgState === 'primary' && (
        <img 
          src={primaryUrl} 
          alt={character_id}
          className="w-full h-full object-cover" 
          onError={() => setImgState('sprite')} 
        />
      )}
      {imgState === 'sprite' && renderSprite()}
      {imgState === 'fallback' && (
        <img src="/images/placeholder.png" alt="Fallback" className="w-full h-full object-cover" />
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
