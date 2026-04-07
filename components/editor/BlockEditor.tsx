'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trash2, GripVertical, Plus } from 'lucide-react';
import { nanoid } from './utils/nanoid';

import type { Block, BlockType, BlockContent, ParagraphContent, HeadingContent, ImageContent, ListContent, CalloutContent } from '@/lib/editor/types';
import { ParagraphBlock } from './blocks/ParagraphBlock';
import { HeadingBlock } from './blocks/HeadingBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { ListBlock } from './blocks/ListBlock';
import { CalloutBlock } from './blocks/CalloutBlock';
import { AIAssistPanel } from './AIAssistPanel';
import { SlashCommandMenu } from './SlashCommandMenu';

// ─── Default content per block type ──────────────────────────────────────────

function defaultContent(type: BlockType): BlockContent {
  switch (type) {
    case 'paragraph': return { text: '' } as ParagraphContent;
    case 'heading-1':
    case 'heading-2': return { text: '' } as HeadingContent;
    case 'image': return { url: '', alt: '' } as ImageContent;
    case 'list': return { items: [''], ordered: false } as ListContent;
    case 'callout': return { text: '', variant: 'info' } as CalloutContent;
  }
}

function createBlock(type: BlockType): Block {
  return { id: nanoid(), type, content: defaultContent(type) };
}

// ─── BlockRow ─────────────────────────────────────────────────────────────────

interface BlockRowProps {
  block: Block;
  isFocused: boolean;
  articleTitle: string;
  showAI: boolean;
  onFocus: () => void;
  onUpdate: (id: string, content: BlockContent) => void;
  onDelete: (id: string) => void;
  onAddAfter: (id: string) => void;
  onEnter: (id: string) => void;
  onSlashCommand: (id: string) => void;
  onToggleAI: (id: string) => void;
}

function BlockRow({
  block, isFocused, articleTitle, showAI,
  onFocus, onUpdate, onDelete, onAddAfter, onEnter, onSlashCommand, onToggleAI,
}: BlockRowProps) {

  const getBlockText = (): string => {
    const c = block.content;
    if ('text' in c) return (c as ParagraphContent | HeadingContent | CalloutContent).text;
    if ('items' in c) return (c as ListContent).items.join(' ');
    return '';
  };

  const renderBlock = () => {
    switch (block.type) {
      case 'paragraph':
        return (
          <ParagraphBlock
            block={block} isFocused={isFocused}
            onUpdate={(c) => onUpdate(block.id, c)}
            onEnter={() => onEnter(block.id)}
            onDelete={() => onDelete(block.id)}
            onSlashCommand={() => onSlashCommand(block.id)}
            onFocus={onFocus}
          />
        );
      case 'heading-1':
      case 'heading-2':
        return (
          <HeadingBlock
            block={block} isFocused={isFocused}
            onUpdate={(c) => onUpdate(block.id, c)}
            onEnter={() => onEnter(block.id)}
            onDelete={() => onDelete(block.id)}
            onFocus={onFocus}
          />
        );
      case 'image':
        return (
          <ImageBlock
            block={block}
            onUpdate={(c) => onUpdate(block.id, c)}
            onFocus={onFocus}
          />
        );
      case 'list':
        return (
          <ListBlock
            block={block} isFocused={isFocused}
            onUpdate={(c) => onUpdate(block.id, c)}
            onEnter={() => onEnter(block.id)}
            onDelete={() => onDelete(block.id)}
            onFocus={onFocus}
          />
        );
      case 'callout':
        return (
          <CalloutBlock
            block={block} isFocused={isFocused}
            onUpdate={(c) => onUpdate(block.id, c)}
            onFocus={onFocus}
          />
        );
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className={`block-row ${isFocused ? 'block-row--focused' : ''}`}
      onClick={onFocus}
    >
      {/* Gutter handles */}
      <div className="block-gutter">
        <button className="block-handle" title="Move block (Phase 2)">
          <GripVertical size={14} />
        </button>
        <button className="block-add-btn" onClick={(e) => { e.stopPropagation(); onAddAfter(block.id); }} title="Add block below">
          <Plus size={13} />
        </button>
      </div>

      {/* Block content */}
      <div className="block-content">
        {renderBlock()}
      </div>

      {/* Block toolbar */}
      <div className={`block-toolbar ${isFocused ? 'block-toolbar--visible' : ''}`}>
        <button
          className={`block-tool-btn ai-btn ${showAI ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleAI(block.id); }}
          title="AI Assist"
        >
          <Sparkles size={13} />
        </button>
        <button
          className="block-tool-btn delete-btn"
          onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
          title="Delete block"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* AI Panel */}
      <AnimatePresence>
        {showAI && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="ai-panel-anchor"
          >
            <AIAssistPanel
              blockText={getBlockText()}
              articleTitle={articleTitle}
              onAccept={(text) => {
                if ('text' in block.content) {
                  onUpdate(block.id, { ...block.content, text });
                }
                onToggleAI(block.id);
              }}
              onClose={() => onToggleAI(block.id)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── BlockEditor ──────────────────────────────────────────────────────────────

interface BlockEditorProps {
  initialBlocks?: Block[];
  articleTitle?: string;
  onChange?: (blocks: Block[]) => void;
}

export function BlockEditor({ initialBlocks, articleTitle = '', onChange }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(
    initialBlocks ?? [createBlock('paragraph')]
  );
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [activeAI, setActiveAI] = useState<string | null>(null);
  const [slashTarget, setSlashTarget] = useState<string | null>(null);

  const updateBlocks = useCallback((next: Block[]) => {
    setBlocks(next);
    onChange?.(next);
  }, [onChange]);

  const handleUpdate = useCallback((id: string, content: BlockContent) => {
    updateBlocks(blocks.map((b) => b.id === id ? { ...b, content } : b));
  }, [blocks, updateBlocks]);

  const handleDelete = useCallback((id: string) => {
    if (blocks.length === 1) return; // Always keep at least one block
    const idx = blocks.findIndex((b) => b.id === id);
    const next = blocks.filter((b) => b.id !== id);
    updateBlocks(next);
    setFocusedId(next[Math.max(0, idx - 1)].id);
  }, [blocks, updateBlocks]);

  const handleAddAfter = useCallback((id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    const newBlock = createBlock('paragraph');
    const next = [...blocks];
    next.splice(idx + 1, 0, newBlock);
    updateBlocks(next);
    setFocusedId(newBlock.id);
  }, [blocks, updateBlocks]);

  const handleEnter = useCallback((id: string) => handleAddAfter(id), [handleAddAfter]);

  const handleSlashCommand = useCallback((id: string) => {
    setSlashTarget(id);
  }, []);

  const handleSlashSelect = useCallback((type: BlockType) => {
    if (!slashTarget) return;
    // Replace the current (empty) block with the new type
    const next = blocks.map((b) =>
      b.id === slashTarget ? { ...b, type, content: defaultContent(type) } : b
    );
    updateBlocks(next);
    setFocusedId(slashTarget);
    setSlashTarget(null);
  }, [slashTarget, blocks, updateBlocks]);

  const handleToggleAI = useCallback((id: string) => {
    setActiveAI((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="block-editor">
      <div className="block-editor-body">
        <AnimatePresence initial={false}>
          {blocks.map((block) => (
            <div key={block.id} className="block-row-wrapper">
              <BlockRow
                block={block}
                isFocused={focusedId === block.id}
                articleTitle={articleTitle}
                showAI={activeAI === block.id}
                onFocus={() => setFocusedId(block.id)}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onAddAfter={handleAddAfter}
                onEnter={handleEnter}
                onSlashCommand={handleSlashCommand}
                onToggleAI={handleToggleAI}
              />
              {/* Slash menu anchored below block */}
              <AnimatePresence>
                {slashTarget === block.id && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="slash-menu-anchor"
                  >
                    <SlashCommandMenu
                      onSelect={handleSlashSelect}
                      onClose={() => setSlashTarget(null)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </AnimatePresence>

        {/* Add block button at page bottom */}
        <button
          className="editor-add-block-btn"
          onClick={() => {
            const newBlock = createBlock('paragraph');
            updateBlocks([...blocks, newBlock]);
            setFocusedId(newBlock.id);
          }}
        >
          <Plus size={15} />
          <span>Add block</span>
        </button>
      </div>
    </div>
  );
}
