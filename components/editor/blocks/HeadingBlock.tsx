'use client';

import { useRef, useEffect, KeyboardEvent } from 'react';
import type { Block, HeadingContent } from '@/lib/editor/types';

interface Props {
  block: Block;
  isFocused: boolean;
  onUpdate: (content: HeadingContent) => void;
  onEnter: () => void;
  onDelete: () => void;
  onFocus: () => void;
}

export function HeadingBlock({ block, isFocused, onUpdate, onEnter, onDelete, onFocus }: Props) {
  const content = block.content as HeadingContent;
  const ref = useRef<HTMLInputElement>(null);
  const isH1 = block.type === 'heading-1';

  useEffect(() => {
    if (isFocused && ref.current) {
      ref.current.focus();
    }
  }, [isFocused]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter();
    }
    if (e.key === 'Backspace' && content.text === '') {
      e.preventDefault();
      onDelete();
    }
  };

  return (
    <input
      ref={ref}
      type="text"
      value={content.text}
      placeholder={isH1 ? 'Heading 1' : 'Heading 2'}
      className={`editor-block-input ${isH1 ? 'heading-1-input' : 'heading-2-input'}`}
      onFocus={onFocus}
      onKeyDown={handleKeyDown}
      onChange={(e) => onUpdate({ text: e.target.value })}
    />
  );
}
