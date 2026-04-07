'use client';

import { useEffect, useRef } from 'react';
import { Text, Heading1, Heading2, Image, List, Zap } from 'lucide-react';
import type { BlockType } from '@/lib/editor/types';

const COMMANDS: { type: BlockType; label: string; desc: string; Icon: React.ElementType }[] = [
  { type: 'paragraph', label: 'Text', desc: 'Plain paragraph', Icon: Text },
  { type: 'heading-1', label: 'Heading 1', desc: 'Large section title', Icon: Heading1 },
  { type: 'heading-2', label: 'Heading 2', desc: 'Sub-section title', Icon: Heading2 },
  { type: 'image', label: 'Image', desc: 'Upload a comp or asset', Icon: Image },
  { type: 'list', label: 'List', desc: 'Bullet or numbered list', Icon: List },
  { type: 'callout', label: 'Callout', desc: 'Highlighted tip or warning', Icon: Zap },
];

interface Props {
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}

export function SlashCommandMenu({ onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="slash-menu">
      <p className="slash-menu-hint">Block type</p>
      {COMMANDS.map(({ type, label, desc, Icon }) => (
        <button
          key={type}
          className="slash-menu-item"
          onClick={() => { onSelect(type); onClose(); }}
        >
          <div className="slash-menu-item-icon">
            <Icon size={16} />
          </div>
          <div className="slash-menu-item-text">
            <span className="slash-menu-item-label">{label}</span>
            <span className="slash-menu-item-desc">{desc}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
