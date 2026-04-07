'use client';

import { useRef, useEffect } from 'react';
import { Info, Lightbulb, AlertTriangle, Flame } from 'lucide-react';
import type { Block, CalloutContent } from '@/lib/editor/types';

interface Props {
  block: Block;
  isFocused: boolean;
  onUpdate: (content: CalloutContent) => void;
  onFocus: () => void;
}

const VARIANTS = {
  info: {
    icon: Info,
    label: 'Info',
    cls: 'callout-info',
  },
  tip: {
    icon: Lightbulb,
    label: 'Tip',
    cls: 'callout-tip',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Warning',
    cls: 'callout-warning',
  },
  danger: {
    icon: Flame,
    label: 'Hot Take',
    cls: 'callout-danger',
  },
} as const;

export function CalloutBlock({ block, isFocused, onUpdate, onFocus }: Props) {
  const content = block.content as CalloutContent;
  const ref = useRef<HTMLTextAreaElement>(null);
  const variant = VARIANTS[content.variant] ?? VARIANTS.info;
  const Icon = variant.icon;

  useEffect(() => {
    if (isFocused && ref.current) ref.current.focus();
  }, [isFocused]);

  // Auto-resize
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [content.text]);

  return (
    <div className={`callout-block ${variant.cls}`} onClick={onFocus}>
      <div className="callout-variant-bar">
        {(Object.keys(VARIANTS) as CalloutContent['variant'][]).map((v) => {
          const VIcon = VARIANTS[v].icon;
          return (
            <button
              key={v}
              className={`callout-variant-btn ${content.variant === v ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onUpdate({ ...content, variant: v }); }}
              title={VARIANTS[v].label}
            >
              <VIcon size={12} />
            </button>
          );
        })}
      </div>
      <div className="callout-body">
        <Icon size={18} className="callout-icon" />
        <textarea
          ref={ref}
          value={content.text}
          placeholder={`${variant.label} — write your callout…`}
          rows={1}
          className="callout-textarea"
          onChange={(e) => onUpdate({ ...content, text: e.target.value })}
        />
      </div>
    </div>
  );
}
