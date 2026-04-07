'use client';

import { useRef, useEffect, KeyboardEvent } from 'react';
import type { Block, ParagraphContent } from '@/lib/editor/types';

interface Props {
  block: Block;
  isFocused: boolean;
  onUpdate: (content: ParagraphContent) => void;
  onEnter: () => void;
  onDelete: () => void;
  onSlashCommand: () => void;
  onFocus: () => void;
}

export function ParagraphBlock({
  block,
  isFocused,
  onUpdate,
  onEnter,
  onDelete,
  onSlashCommand,
  onFocus,
}: Props) {
  const content = block.content as ParagraphContent;
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isFocused && ref.current) {
      ref.current.focus();
      // Move cursor to end
      const len = ref.current.value.length;
      ref.current.setSelectionRange(len, len);
    }
  }, [isFocused]);

  // Auto-resize textarea
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [content.text]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onEnter();
    }
    if (e.key === 'Backspace' && content.text === '') {
      e.preventDefault();
      onDelete();
    }
    if (e.key === '/' && content.text === '') {
      e.preventDefault();
      onSlashCommand();
    }
  };

  return (
    <textarea
      ref={ref}
      value={content.text}
      placeholder="Write something… or type '/' for commands"
      rows={1}
      className="editor-block-input paragraph-input"
      onFocus={onFocus}
      onKeyDown={handleKeyDown}
      onChange={(e) => onUpdate({ text: e.target.value })}
    />
  );
}
