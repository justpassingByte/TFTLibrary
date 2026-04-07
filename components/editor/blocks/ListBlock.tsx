'use client';

import { useRef, useEffect, KeyboardEvent } from 'react';
import type { Block, ListContent } from '@/lib/editor/types';

interface Props {
  block: Block;
  isFocused: boolean;
  onUpdate: (content: ListContent) => void;
  onEnter: () => void;
  onDelete: () => void;
  onFocus: () => void;
}

export function ListBlock({ block, isFocused, onUpdate, onEnter, onDelete, onFocus }: Props) {
  const content = block.content as ListContent;
  const lastItemRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFocused && lastItemRef.current) {
      lastItemRef.current.focus();
    }
  }, [isFocused, content.items.length]);

  const updateItem = (index: number, value: string) => {
    const items = [...content.items];
    items[index] = value;
    onUpdate({ ...content, items });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Add new item after current
      if (index === content.items.length - 1 && content.items[index] === '') {
        // Last item is empty → convert to paragraph
        onEnter();
      } else {
        const items = [...content.items];
        items.splice(index + 1, 0, '');
        onUpdate({ ...content, items });
      }
    }
    if (e.key === 'Backspace' && content.items[index] === '' && content.items.length === 1) {
      e.preventDefault();
      onDelete();
    }
    if (e.key === 'Backspace' && content.items[index] === '' && content.items.length > 1) {
      e.preventDefault();
      const items = content.items.filter((_, i) => i !== index);
      onUpdate({ ...content, items });
    }
  };

  return (
    <div className="list-block" onClick={onFocus}>
      <div className="list-block-toggle">
        <button
          className={`list-type-btn ${!content.ordered ? 'active' : ''}`}
          onClick={() => onUpdate({ ...content, ordered: false })}
        >•</button>
        <button
          className={`list-type-btn ${content.ordered ? 'active' : ''}`}
          onClick={() => onUpdate({ ...content, ordered: true })}
        >1.</button>
      </div>
      <ul className="list-block-items">
        {content.items.map((item, i) => (
          <li key={i} className="list-block-item">
            <span className="list-bullet">
              {content.ordered ? `${i + 1}.` : '•'}
            </span>
            <input
              ref={i === content.items.length - 1 ? lastItemRef : undefined}
              type="text"
              value={item}
              placeholder="List item"
              className="list-item-input"
              onChange={(e) => updateItem(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, i)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
