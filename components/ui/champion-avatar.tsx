import React from 'react';
import { DDRAGON_VERSION } from '@/lib/riot-cdn';
import { GENERATED_CHAMPIONS } from '@/lib/generated-data';

interface ChampionAvatarProps {
  name: string;
  className?: string;
  shape?: 'circle' | 'hexagon';
}

export function ChampionAvatar({ name, className = "", shape = 'circle' }: ChampionAvatarProps) {
  const clipPath = shape === 'hexagon' ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' : undefined;
  const roundedClass = shape === 'circle' ? 'rounded-full' : '';
  const champ = GENERATED_CHAMPIONS.find(c => c.name === name || c.id === name);

  if (!champ || !champ.image?.sprite) {
    return (
      <div className={`${roundedClass} bg-[var(--color-grimoire)] border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden ${className}`} style={{ clipPath }}>
        <span className="text-[10px] text-white/40">{name.slice(0, 2)}</span>
      </div>
    );
  }

  const { sprite, x, y, w, h } = champ.image;
  const spriteUrl = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/sprite/${sprite}`;

  return (
    <div className={`overflow-hidden bg-black flex-shrink-0 flex items-center justify-center ${roundedClass} ${className}`} style={{ clipPath }}>
      <svg viewBox="0 0 48 48" className="w-full h-full pointer-events-none" style={{ transform: 'scale(1.15)', overflow: 'visible' }}>
        <foreignObject x={0} y={0} width={w || 48} height={h || 48}>
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `url(${spriteUrl})`,
              backgroundPosition: `-${x}px -${y}px`,
              backgroundRepeat: 'no-repeat',
            }}
            title={name}
          />
        </foreignObject>
      </svg>
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
